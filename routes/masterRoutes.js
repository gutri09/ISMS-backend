const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');

router.get('/config', masterController.getConfig);
router.post('/continents', masterController.addContinent);
router.delete('/continents/:name', masterController.deleteContinent);

router.post('/countries', masterController.addCountry);
router.delete('/countries/:code', masterController.deleteCountry);

router.post('/components', masterController.addComponent);
router.delete('/components/:name', masterController.deleteComponent);

router.post('/templates', masterController.addTemplate);
router.delete('/templates/:type/:value', masterController.deleteTemplate);

module.exports = router;
