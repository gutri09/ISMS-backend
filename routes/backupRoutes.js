const express = require('express');
const router = express.Router();
const controller = require('../controllers/backupController');

router.get('/backup/status', controller.getBackupStatus);
router.post('/backup/save', controller.saveBackup);
router.post('/backup/restore', controller.restoreBackup);

module.exports = router;
