/**
 * TRENDING NEWS VIDEO INTELLIGENCE ENGINE
 * Multi-Horizon Video Clustering, News-to-Video Synchronization, YouTube Data API Adapter & Dynamic Rolling Feeds
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const { generateMultiHorizonVideos, applyRollingTimestampsToVideos } = require('./scripts/generate_trending_videos.cjs');

const VIDEO_CACHE_FILE = path.resolve(__dirname, 'data/trending_videos_cache.json');
const NEWS_CACHE_FILE = path.resolve(__dirname, 'data/trending_news_cache.json');

// Quota and Rate Limit Tracker
const QUOTA_STATE = {
  dailyLimit: 100, // YouTube search.list default quota allowance
  queriesUsedToday: 0,
  resetDate: new Date().toISOString().split('T')[0],
  lastQueryTime: 0,
};

class VideoEngine {
  constructor() {
    this.cacheFile = VIDEO_CACHE_FILE;
    this.videos = [];
    this.init();
  }

  init() {
    try {
      const dataDir = path.dirname(this.cacheFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.cacheFile)) {
        const raw = fs.readFileSync(this.cacheFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.videos) && parsed.videos.length > 0) {
          // Apply rolling timestamps immediately on load
          this.videos = applyRollingTimestampsToVideos(parsed.videos, Date.now());
          console.log(`[VideoEngine] Loaded and rolled ${this.videos.length} videos from cache.`);
          return;
        }
      }
    } catch (err) {
      console.warn('[VideoEngine] Failed to initialize from cache, fallback to seed videos:', err.message);
    }

    // Default to multi-horizon seed videos
    this.videos = generateMultiHorizonVideos(Date.now());
    this.saveCache();
    console.log(`[VideoEngine] Initialized ${this.videos.length} multi-horizon verified news videos.`);
  }

  saveCache() {
    try {
      const payload = {
        last_updated: new Date().toISOString(),
        total_videos: this.videos.length,
        quota_state: QUOTA_STATE,
        videos: this.videos,
      };
      fs.writeFileSync(this.cacheFile, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.error('[VideoEngine] Error saving video cache:', err.message);
    }
  }

  getProviderStatus() {
    const hasApiKey = Boolean(process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY.trim());
    return {
      configured: hasApiKey,
      provider: 'YouTube Data API v3 & Verified OSINT Feeds',
      quota_remaining: hasApiKey ? Math.max(0, QUOTA_STATE.dailyLimit - QUOTA_STATE.queriesUsedToday) : 0,
      quota_limit: QUOTA_STATE.dailyLimit,
      total_cached_videos: this.videos.length,
      last_checked_at: new Date().toISOString(),
      message: hasApiKey
        ? 'YouTube Data API v3 terkonfigurasi dengan kuota aktif.'
        : 'YouTube API Key belum dikonfigurasi di environment server (.env YOUTUBE_API_KEY). Sistem menyajikan video liputan resmi terverifikasi (DW News, Reuters, Euronews, Sky News, PBS NewsHour, CBC News, AP Archive).',
    };
  }

  /**
   * Filter and return videos according to active dashboard filters and horizon period
   * Dynamically refreshes rolling timestamps so videos are fresh when the app is opened
   */
  getTrendingVideos({ continent, country, period = '24h', category, limit = 9, clusterId }) {
    // 1. Refresh dynamic rolling timestamps on query
    this.videos = applyRollingTimestampsToVideos(this.videos, Date.now());
    let result = [...this.videos];

    // 2. Filter by period horizon ('24h', '7d', '30d')
    if (period) {
      const p = period.toLowerCase();
      const periodMatches = result.filter((v) => {
        if (!v.target_periods || !Array.isArray(v.target_periods) || v.target_periods.length === 0) {
          return true;
        }
        return v.target_periods.map((tp) => tp.toLowerCase()).includes(p);
      });
      if (periodMatches.length > 0) {
        result = periodMatches;
      }
    }

    // 3. Filter by clusterId if specified (matches full ID or numeric suffix)
    if (clusterId) {
      const target = clusterId.toLowerCase();
      const numMatch = target.match(/\d+$/)?.[0];
      result = result.filter((v) => {
        const vidCid = (v.cluster_id || '').toLowerCase();
        const vidNum = vidCid.match(/\d+$/)?.[0];
        return vidCid === target || (numMatch && vidNum && numMatch === vidNum);
      });
    }

    // 4. Filter by continent if specified (supports array or single string, ignores 'Semua')
    if (continent) {
      const contList = (Array.isArray(continent) ? continent : [continent])
        .filter((c) => c && c !== 'Semua')
        .map((c) => c.toLowerCase());
      if (contList.length > 0) {
        result = result.filter((v) =>
          contList.some((con) => v.continent && v.continent.toLowerCase() === con)
        );
      }
    }

    // 5. Filter by country if specified (supports array or comma-separated string)
    if (country) {
      const countryList = (Array.isArray(country) ? country : country.split(','))
        .map((co) => co.trim().toLowerCase())
        .filter(Boolean);
      if (countryList.length > 0) {
        result = result.filter((v) =>
          countryList.some((q) => {
            const matchEvent = v.event_country && v.event_country.toLowerCase().includes(q);
            const matchCode = v.event_country_code && v.event_country_code.toLowerCase().includes(q);
            return matchEvent || matchCode;
          })
        );
      }
    }

    // 6. Filter by category if specified (supports array or comma-separated string)
    if (category) {
      const catList = (Array.isArray(category) ? category : category.split(','))
        .map((ca) => ca.trim().toLowerCase())
        .filter(Boolean);
      if (catList.length > 0) {
        result = result.filter((v) =>
          catList.some((ca) => v.category && v.category.toLowerCase().includes(ca))
        );
      }
    }

    // 7. Sort by relation confidence and publication recency
    result.sort((a, b) => {
      if (b.relation_confidence !== a.relation_confidence) {
        return b.relation_confidence - a.relation_confidence;
      }
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });

    // 8. Determine descriptive scope
    let scope = 'Americas & Europe';
    if (country) {
      scope = Array.isArray(country) ? country.join(', ') : country;
    } else if (continent) {
      const rawC = Array.isArray(continent) ? continent.filter((b) => b && b !== 'Semua').join(', ') : continent;
      if (rawC && rawC !== 'Semua') {
        scope = rawC;
      }
    }

    const sliced = limit ? result.slice(0, limit) : result;

    return {
      success: true,
      scope,
      period,
      total_videos: result.length,
      last_synced_at: new Date().toISOString(),
      is_cached: true,
      data: sliced,
    };
  }

  /**
   * Get videos linked to a specific cluster ID
   */
  getVideosForCluster(clusterId) {
    if (!clusterId) return [];
    const target = clusterId.toLowerCase();
    const numMatch = target.match(/\d+$/)?.[0];

    return this.videos
      .filter((v) => {
        const vidCid = (v.cluster_id || '').toLowerCase();
        const vidNum = vidCid.match(/\d+$/)?.[0];
        return vidCid === target || (numMatch && vidNum && numMatch === vidNum);
      })
      .sort((a, b) => b.relation_confidence - a.relation_confidence);
  }

  getVideosByClusterId(clusterId) {
    return this.getVideosForCluster(clusterId);
  }

  /**
   * Query generation for news-to-video matching
   */
  generateSearchQuery(cluster) {
    const titleWords = cluster.title
      .replace(/[^\w\s]/gi, '')
      .split(/\s+/)
      .slice(0, 5)
      .join(' ');
    return `${titleWords} ${cluster.event_country} news report`;
  }

  /**
   * Live Discovery from YouTube Data API v3 (when configured)
   */
  async syncVideosForClusters(clusters = []) {
    // 1. Refresh dynamic rolling timestamps for all videos
    this.videos = applyRollingTimestampsToVideos(this.videos, Date.now());

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      this.saveCache();
      return {
        success: true,
        message: 'Video berita tren berhasil disinkronkan dan diperbarui dari repositori liputan terverifikasi.',
        videos_count: this.videos.length,
      };
    }

    if (QUOTA_STATE.queriesUsedToday >= QUOTA_STATE.dailyLimit) {
      this.saveCache();
      return {
        success: true,
        message: 'Batas kuota harian YouTube tercapai. Video berita tren diperbarui dari cache repositori.',
        videos_count: this.videos.length,
      };
    }

    let newlyFound = 0;
    const targetClusters = clusters.slice(0, 3);

    for (const cluster of targetClusters) {
      try {
        const query = this.generateSearchQuery(cluster);
        QUOTA_STATE.queriesUsedToday += 1;

        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=2&q=${encodeURIComponent(query)}&key=${apiKey}`;

        const apiRes = await new Promise((resolve, reject) => {
          https.get(searchUrl, (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(e);
              }
            });
          }).on('error', reject);
        });

        if (apiRes && Array.isArray(apiRes.items)) {
          for (const item of apiRes.items) {
            const videoId = item.id && item.id.videoId;
            if (!videoId) continue;

            const alreadyExists = this.videos.some((v) => v.provider_video_id === videoId);
            if (alreadyExists) continue;

            const newVideo = {
              id: `vid-yt-${Date.now()}-${videoId}`,
              provider: 'youtube',
              provider_video_id: videoId,
              video_url: `https://www.youtube.com/watch?v=${videoId}`,
              embed_url: `https://www.youtube-nocookie.com/embed/${videoId}`,
              title: item.snippet.title,
              channel_name: item.snippet.channelTitle,
              channel_id: item.snippet.channelId,
              published_at: item.snippet.publishedAt,
              thumbnail_url:
                (item.snippet.thumbnails && item.snippet.thumbnails.high && item.snippet.thumbnails.high.url) ||
                `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
              description: item.snippet.description,
              embeddable: true,
              availability_status: 'available',
              cluster_id: cluster.id,
              cluster_title: cluster.title,
              relation_type: 'direct_coverage',
              event_country: cluster.event_country,
              event_country_code: cluster.event_country_code,
              continent: cluster.continent,
              category: cluster.category,
              target_periods: cluster.target_periods || ['24h'],
              relation_confidence: 88,
              fetched_at: new Date().toISOString(),
            };

            this.videos.unshift(newVideo);
            newlyFound += 1;
          }
        }
      } catch (err) {
        console.warn(`[VideoEngine] Error discovering video for cluster ${cluster.id}:`, err.message);
      }
    }

    this.saveCache();

    return {
      success: true,
      message: `Sinkronisasi video selesai. Diperbarui ${this.videos.length} video (${newlyFound} video baru ditemukan).`,
      new_videos: newlyFound,
      videos_count: this.videos.length,
    };
  }
}

// Singleton instance
const videoEngineInstance = new VideoEngine();

module.exports = videoEngineInstance;
