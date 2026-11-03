const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');
const { requireDeviceAuth } = require('../middlewares/deviceAuth');

// POST /api/v1/device/scan (protected by device authentication)
router.post('/scan', requireDeviceAuth, scanController.handleScan);

module.exports = router;

