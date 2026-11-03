const deviceService = require('../services/deviceService');
const config = require('../config');
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
    const rawDevices = await deviceService.getDevices();
    const heartbeatCutoff = new Date(Date.now() - config.deviceHeartbeatThresholdSeconds * 1000);

    const devices = rawDevices.map((d) => {
      const isOnline = d.status === 'active' && d.lastSeen && new Date(d.lastSeen) >= heartbeatCutoff;
      return {
        _id: d._id,
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        location: d.location,
        status: d.status,
        lastSeen: d.lastSeen,
        firmwareVersion: d.firmwareVersion,
        createdAt: d.createdAt,
        isOnline: Boolean(isOnline),
      };
    });

    return successResponse(res, { devices }, 'Devices retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getDeviceById = async (req, res, next) => {
  try {
    const device = await deviceService.getDeviceById(req.params.deviceId);
    const heartbeatCutoff = new Date(Date.now() - config.deviceHeartbeatThresholdSeconds * 1000);
    const isOnline = device.status === 'active' && device.lastSeen && new Date(device.lastSeen) >= heartbeatCutoff;

    return successResponse(res, {
      device: {
        _id: device._id,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        location: device.location,
        status: device.status,
        lastSeen: device.lastSeen,
        firmwareVersion: device.firmwareVersion,
        createdAt: device.createdAt,
        isOnline: Boolean(isOnline),
      },
    }, 'Device retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const updateDevice = async (req, res, next) => {
  try {
    const device = await deviceService.updateDevice(req.params.deviceId, req.body);
    return successResponse(res, { device }, 'Device updated successfully');
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
  updateDevice,
  updateDeviceStatus,
};
