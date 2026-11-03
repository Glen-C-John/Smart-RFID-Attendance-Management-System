const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: [true, 'Device ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    deviceName: {
      type: String,
      required: [true, 'Device name is required'],
      trim: true,
    },
    apiKey: {
      type: String,
      required: [true, 'Device API key is required'],
      trim: true,
    },
    location: {
      type: String,
      trim: true,
      default: 'Main Entrance',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'revoked'],
      default: 'active',
      index: true,
    },
    lastSeen: {
      type: Date,
      default: null,
    },
    firmwareVersion: {
      type: String,
      trim: true,
      default: '1.0.0',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Device', deviceSchema);

