const videoEngine = require('../videoEngine.cjs');

exports.getTrendingVideos = async (req, res) => {
  try {
    const { country, continent, category, limit, period, clusterId } = req.query;
    const result = await videoEngine.getTrendingVideos({
      country,
      continent,
      category,
      period: period || '24h',
      clusterId,
      limit: limit ? parseInt(limit, 10) : 9,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getVideosByCluster = async (req, res) => {
  try {
    const { clusterId } = req.params;
    const result = await videoEngine.getVideosByClusterId(clusterId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.syncVideos = async (req, res) => {
  try {
    const result = await videoEngine.syncVideosForClusters();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getVideoStatus = (req, res) => {
  try {
    const status = videoEngine.getProviderStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
