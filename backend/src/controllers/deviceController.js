const deviceService = require('../services/deviceService');
const { successResponse } = require('../utils/response');

const registerDevice = async (req, res, next) => {
  try {
    const { deviceId, deviceName, location, apiKey, firmwareVersion } = req.body;
    if (!deviceId || !deviceName) {
      return res.status(400).json({
        success: false,
        message: 'deviceId and deviceName are required fields',
      });
    }

    const device = await deviceService.registerDevice({
      deviceId,
      deviceName,
      location,
      apiKey,
      firmwareVersion,
    });

    return successResponse(res, { device }, 'Device registered successfully', 201);
  } catch (error) {
    next(error);
  }
};

const getDevices = async (req, res, next) => {
  try {
    const devices = await deviceService.getDevices();
    return successResponse(res, { devices }, 'Devices retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getDeviceById = async (req, res, next) => {
  try {
    const device = await deviceService.getDeviceById(req.params.deviceId);
    return successResponse(res, { device }, 'Device retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const updateDeviceStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive', 'revoked'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'active', 'inactive', or 'revoked'",
      });
    }
    const device = await deviceService.updateDeviceStatus(req.params.deviceId, status);
    return successResponse(res, { device }, 'Device status updated');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerDevice,
  getDevices,
  getDeviceById,
  updateDeviceStatus,
};

