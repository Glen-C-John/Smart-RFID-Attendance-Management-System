const attendanceService = require('../services/attendanceService');

const handleScan = async (req, res, next) => {
  try {
    const { deviceId, cardUid, tagData, timestamp, eventId, firmwareVersion } = req.body;

    const effectiveDeviceId = deviceId || (req.device ? req.device.deviceId : null);

    if (!effectiveDeviceId || !cardUid) {
      return res.status(400).json({
        success: false,
        message: 'deviceId and cardUid are required fields',
      });
    }

    const result = await attendanceService.processScan({
      deviceId: effectiveDeviceId,
      cardUid,
      tagData,
      timestamp,
      eventId,
    });

    const statusCode = result.statusCode || (result.success ? 200 : 400);

    // Return the clean response payload matching firmware expectations
    return res.status(statusCode).json({
      success: result.success,
      studentName: result.studentName || undefined,
      message: result.message,
      attendanceStatus: result.attendanceStatus || undefined,
      checkInTime: result.checkInTime || undefined,
      checkOutTime: result.checkOutTime || undefined,
      action: result.action || undefined,
      isDuplicate: result.isDuplicate || undefined,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  handleScan,
};

