const Setting = require('../models/Setting');
const config = require('../config');
const { successResponse } = require('../utils/response');

const getSettings = async (req, res, next) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({
        institutionName: 'Smart IoT Institute of Technology',
        workDayStartTime: config.attendance.workDayStartTime,
        lateThresholdTime: config.attendance.lateThresholdTime,
        cooldownSeconds: config.attendance.cooldownSeconds,
        checkoutMinIntervalMinutes: config.attendance.checkoutMinIntervalMinutes,
        enableCheckout: config.attendance.enableCheckout,
        timezone: config.timezone,
        deviceHeartbeatThresholdSeconds: config.deviceHeartbeatThresholdSeconds,
      });
    }

    return successResponse(res, { settings }, 'System settings retrieved');
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
    }

    const {
      institutionName,
      workDayStartTime,
      lateThresholdTime,
      cooldownSeconds,
      checkoutMinIntervalMinutes,
      enableCheckout,
      timezone,
      deviceHeartbeatThresholdSeconds,
    } = req.body;

    const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    if (workDayStartTime !== undefined && !timeRegex.test(workDayStartTime.trim())) {
      return res.status(400).json({ success: false, message: "workDayStartTime must be in 'HH:mm' 24-hour format" });
    }
    if (lateThresholdTime !== undefined && !timeRegex.test(lateThresholdTime.trim())) {
      return res.status(400).json({ success: false, message: "lateThresholdTime must be in 'HH:mm' 24-hour format" });
    }
    if (cooldownSeconds !== undefined && (isNaN(Number(cooldownSeconds)) || Number(cooldownSeconds) < 0)) {
      return res.status(400).json({ success: false, message: 'cooldownSeconds must be a positive number or zero' });
    }
    if (checkoutMinIntervalMinutes !== undefined && (isNaN(Number(checkoutMinIntervalMinutes)) || Number(checkoutMinIntervalMinutes) < 0)) {
      return res.status(400).json({ success: false, message: 'checkoutMinIntervalMinutes must be a positive number or zero' });
    }
    if (deviceHeartbeatThresholdSeconds !== undefined && (isNaN(Number(deviceHeartbeatThresholdSeconds)) || Number(deviceHeartbeatThresholdSeconds) < 10)) {
      return res.status(400).json({ success: false, message: 'deviceHeartbeatThresholdSeconds must be at least 10 seconds' });
    }

    if (institutionName !== undefined) settings.institutionName = institutionName.trim();
    if (workDayStartTime !== undefined) settings.workDayStartTime = workDayStartTime.trim();
    if (lateThresholdTime !== undefined) settings.lateThresholdTime = lateThresholdTime.trim();
    if (cooldownSeconds !== undefined) settings.cooldownSeconds = Number(cooldownSeconds);
    if (checkoutMinIntervalMinutes !== undefined) settings.checkoutMinIntervalMinutes = Number(checkoutMinIntervalMinutes);
    if (enableCheckout !== undefined) settings.enableCheckout = Boolean(enableCheckout);
    if (timezone !== undefined) settings.timezone = timezone.trim();
    if (deviceHeartbeatThresholdSeconds !== undefined) settings.deviceHeartbeatThresholdSeconds = Number(deviceHeartbeatThresholdSeconds);

    await settings.save();

    // Also update runtime config in-memory
    config.attendance.workDayStartTime = settings.workDayStartTime;
    config.attendance.lateThresholdTime = settings.lateThresholdTime;
    config.attendance.cooldownSeconds = settings.cooldownSeconds;
    config.attendance.checkoutMinIntervalMinutes = settings.checkoutMinIntervalMinutes;
    config.attendance.enableCheckout = settings.enableCheckout;
    config.timezone = settings.timezone;
    config.deviceHeartbeatThresholdSeconds = settings.deviceHeartbeatThresholdSeconds;

    return successResponse(res, { settings }, 'System settings updated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
};

