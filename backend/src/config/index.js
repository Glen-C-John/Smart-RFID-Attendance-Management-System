require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/rfid_attendance',
  timezone: process.env.TIMEZONE || 'Asia/Kolkata',
  adminApiKey: process.env.ADMIN_API_KEY || 'admin_super_secret_key_change_in_production',
  defaultDeviceId: process.env.DEFAULT_DEVICE_ID || 'ESP8266_001',
  defaultDeviceKey: process.env.DEFAULT_DEVICE_KEY || 'esp8266_device_secret_token_123',
  attendance: {
    cooldownSeconds: parseInt(process.env.ATTENDANCE_COOLDOWN_SECONDS, 10) || 60,
    checkoutMinIntervalMinutes: parseInt(process.env.CHECKOUT_MIN_INTERVAL_MINUTES, 10) || 5,
    workDayStartTime: process.env.WORK_DAY_START_TIME || '09:00',
    lateThresholdTime: process.env.LATE_THRESHOLD_TIME || '09:30',
    enableCheckout: process.env.ENABLE_CHECKOUT !== 'false',
  },
};

module.exports = config;

