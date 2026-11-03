const attendanceService = require('../services/attendanceService');
const { successResponse } = require('../utils/response');

const getAttendance = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const filter = {};
    if (req.query.studentId) filter.studentId = req.query.studentId.toUpperCase();
    if (req.query.attendanceDate) filter.attendanceDate = req.query.attendanceDate;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.deviceId) filter.deviceId = req.query.deviceId;

    const result = await attendanceService.getAttendance(filter, page, limit);
    return successResponse(res, result, 'Attendance records retrieved');
  } catch (error) {
    next(error);
  }
};

const getAttendanceById = async (req, res, next) => {
  try {
    const record = await attendanceService.getAttendanceById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }
    return successResponse(res, { attendance: record }, 'Attendance record details');
  } catch (error) {
    next(error);
  }
};

const getAttendanceByStudent = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const result = await attendanceService.getAttendanceByStudent(req.params.studentId, page, limit);
    return successResponse(res, result, `Attendance records for student ${req.params.studentId}`);
  } catch (error) {
    next(error);
  }
};

const getAttendanceByDate = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const result = await attendanceService.getAttendanceByDate(req.params.date, page, limit);
    return successResponse(res, result, `Attendance records for date ${req.params.date}`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAttendance,
  getAttendanceById,
  getAttendanceByStudent,
  getAttendanceByDate,
};

