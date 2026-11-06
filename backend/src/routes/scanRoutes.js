const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');
const { requireDeviceAuth } = require('../middlewares/deviceAuth');

// POST /api/v1/device/scan (protected by device authentication)
router.post('/scan', requireDeviceAuth, scanController.handleScan);

// POST /api/v1/device/ping (lightweight connectivity & status ping)
router.post('/ping', requireDeviceAuth, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Pong',
    deviceId: req.device.deviceId,
    lastSeen: req.device.lastSeen,
  });
});

// POST /api/v1/device/heartbeat (heartbeat acknowledgment)
router.post('/heartbeat', requireDeviceAuth, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Heartbeat acknowledged',
    deviceId: req.device.deviceId,
    lastSeen: req.device.lastSeen,
  });
});

module.exports = router;

