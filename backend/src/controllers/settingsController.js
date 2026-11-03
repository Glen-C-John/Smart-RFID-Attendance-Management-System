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

