const express = require('express');
const router = express.Router();
const controller = require('../controllers/videoController');

router.get('/trending/videos', controller.getTrendingVideos);
router.get('/trending/videos/status', controller.getVideoStatus);
router.post('/trending/videos/sync', controller.syncVideos);
router.get('/trending/videos/cluster/:clusterId', controller.getVideosByCluster);

module.exports = router;
