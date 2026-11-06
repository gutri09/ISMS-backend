const trendingEngine = require('../trendingEngine.cjs');

exports.getTrendingIssues = (req, res) => {
  try {
    const { continent, country, period, category, limit } = req.query;
    const result = trendingEngine.getTrendingIssues({
      continent,
      country,
      period: period || '24h',
      category,
      limit: limit ? parseInt(limit, 10) : 10,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getTrendingTimeline = (req, res) => {
  try {
    const { continent, country, period } = req.query;
    const result = trendingEngine.getAggregatedTimeline({
      continent,
      country,
      period: period || '24h',
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.syncTrendingIssues = async (req, res) => {
  try {
    const syncFn = typeof trendingEngine.forceSync === 'function'
      ? trendingEngine.forceSync.bind(trendingEngine)
      : trendingEngine.syncFromLiveProviders.bind(trendingEngine);
    const result = await syncFn();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getClusterById = (req, res) => {
  try {
    const getFn = typeof trendingEngine.getClusterById === 'function'
      ? trendingEngine.getClusterById.bind(trendingEngine)
      : trendingEngine.getClusterDetail.bind(trendingEngine);
    const cluster = getFn(req.params.id);
    if (!cluster) {
      return res.status(404).json({ success: false, error: 'Klaster berita tidak ditemukan' });
    }
    res.json({ success: true, data: cluster });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getTrendingStats = (req, res) => {
  try {
    const stats = trendingEngine.getStatistics();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
