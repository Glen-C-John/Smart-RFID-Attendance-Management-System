const Device = require('../models/Device');
const config = require('../config');
const { errorResponse } = require('../utils/response');

/**
 * Middleware to authenticate ESP8266 or other IoT scanning devices.
 * Checks headers 'x-device-id' and 'x-device-key', or fallback to body properties.
 */
const requireDeviceAuth = async (req, res, next) => {
  const body = req.body || {};
  const deviceId = req.headers['x-device-id'] || body.deviceId;
  const deviceKey = req.headers['x-device-key'] || body.deviceKey || body.apiKey;

  if (!deviceId || !deviceKey) {
    return errorResponse(
      res,
      'Device authentication failed: Missing device credentials (deviceId or deviceKey)',
      401
    );
  }

  try {
    let device = await Device.findOne({ deviceId });

    // Bootstrap default device if database is brand new and credentials match config
    if (!device && deviceId === config.defaultDeviceId && deviceKey === config.defaultDeviceKey) {
      device = await Device.create({
        deviceId: config.defaultDeviceId,
        deviceName: 'Default ESP8266 NodeMCU Scanner',
        apiKey: config.defaultDeviceKey,
        location: 'Main Entrance',
        status: 'active',
        firmwareVersion: body.firmwareVersion || '1.0.0',
        lastSeen: new Date(),
      });
    }

    if (!device) {
      return errorResponse(res, 'Device authentication failed: Unknown device ID', 401);
    }

    if (device.status !== 'active') {
      return errorResponse(res, `Device authentication failed: Device status is ${device.status}`, 403);
    }

    if (device.apiKey !== deviceKey) {
      return errorResponse(res, 'Device authentication failed: Invalid device key', 401);
    }

    // Update last seen and firmware version asynchronously
    device.lastSeen = new Date();
    if (body.firmwareVersion) {
      device.firmwareVersion = body.firmwareVersion;
    }
    await device.save();

    req.device = device;
    next();
  } catch (error) {
    console.error('[DeviceAuth] Error authenticating device:', error);
    return errorResponse(res, 'Internal error verifying device authentication', 500);
  }
};

module.exports = {
  requireDeviceAuth,
};

