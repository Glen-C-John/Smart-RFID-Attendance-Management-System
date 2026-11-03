const Device = require('../models/Device');
const crypto = require('crypto');

class DeviceService {
  async registerDevice({ deviceId, deviceName, location, apiKey, firmwareVersion = '1.0.0' }) {
    const cleanDeviceId = deviceId.trim();
    const existing = await Device.findOne({ deviceId: cleanDeviceId });
    if (existing) {
      const err = new Error(`Device '${cleanDeviceId}' is already registered`);
      err.statusCode = 409;
      throw err;
    }

    const generatedKey = apiKey || `dev_key_${crypto.randomBytes(16).toString('hex')}`;

    const device = await Device.create({
      deviceId: cleanDeviceId,
      deviceName,
      location: location || 'Main Entrance',
      apiKey: generatedKey,
      firmwareVersion,
      status: 'active',
      lastSeen: null,
    });

    return device;
  }

  async getDevices() {
    return Device.find().sort({ createdAt: -1 });
  }

  async getDeviceById(deviceId) {
    const device = await Device.findOne({ deviceId });
    if (!device) {
      const err = new Error(`Device '${deviceId}' not found`);
      err.statusCode = 404;
      throw err;
    }
    return device;
  }

  async updateDeviceStatus(deviceId, status) {
    const device = await Device.findOneAndUpdate(
      { deviceId },
      { status },
      { returnDocument: 'after' }
    );
    if (!device) {
      const err = new Error(`Device '${deviceId}' not found`);
      err.statusCode = 404;
      throw err;
    }
    return device;
  }
}

module.exports = new DeviceService();

