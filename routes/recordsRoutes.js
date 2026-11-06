const express = require('express');
const router = express.Router();
const controller = require('../controllers/recordsController');

router.get('/health', controller.getHealth);
router.get('/records', controller.getAllRecords);
router.get('/records/:id', controller.getRecordById);
router.post('/records', controller.createRecord);
router.put('/records/:id', controller.updateRecord);
router.delete('/records/:id', controller.deleteRecord);
router.post('/records/bulk-delete', controller.bulkDeleteRecords);
router.post('/records/bulk', controller.bulkImportRecords);
router.post('/records/reset-real', controller.resetRealDataset);

module.exports = router;
