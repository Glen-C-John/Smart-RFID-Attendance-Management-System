const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { requireAdminAuth } = require('../middlewares/auth');

router.use(requireAdminAuth);

router.post('/register', deviceController.registerDevice);
router.get('/', deviceController.getDevices);
router.get('/:deviceId', deviceController.getDeviceById);
router.put('/:deviceId/status', deviceController.updateDeviceStatus);

module.exports = router;

