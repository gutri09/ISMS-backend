const express = require('express');
const router = express.Router();
const controller = require('../controllers/trendingController');

router.get('/trending/issues', controller.getTrendingIssues);
router.get('/trending/timeline', controller.getTrendingTimeline);
router.post('/trending/sync', controller.syncTrendingIssues);
router.get('/trending/cluster/:id', controller.getClusterById);
router.get('/trending/stats', controller.getTrendingStats);

module.exports = router;
