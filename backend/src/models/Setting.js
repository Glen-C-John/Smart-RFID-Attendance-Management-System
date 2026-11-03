const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    institutionName: {
      type: String,
      default: 'Smart IoT Institute of Technology',
      trim: true,
    },
    workDayStartTime: {
      type: String,
      default: '09:00',
      trim: true,
    },
    lateThresholdTime: {
      type: String,
      default: '09:30',
      trim: true,
    },
    cooldownSeconds: {
      type: Number,
      default: 60,
    },
    checkoutMinIntervalMinutes: {
      type: Number,
      default: 5,
    },
    enableCheckout: {
      type: Boolean,
      default: true,
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
      trim: true,
    },
    deviceHeartbeatThresholdSeconds: {
      type: Number,
      default: 180,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Setting', settingSchema);

