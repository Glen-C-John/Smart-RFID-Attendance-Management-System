const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Device = require('../models/Device');
const attendanceService = require('../services/attendanceService');
const { successResponse, errorResponse } = require('../utils/response');

const getAttendance = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const filter = {};

    if (req.query.studentId) filter.studentId = req.query.studentId.toUpperCase();
    if (req.query.status) filter.status = req.query.status;
    if (req.query.deviceId) filter.deviceId = req.query.deviceId;

    // Date filtering: single date or date range
    if (req.query.attendanceDate) {
      filter.attendanceDate = req.query.attendanceDate;
    } else if (req.query.startDate && req.query.endDate) {
      filter.attendanceDate = { $gte: req.query.startDate, $lte: req.query.endDate };
    } else if (req.query.startDate) {
      filter.attendanceDate = { $gte: req.query.startDate };
    }

    // Filter by student name or class if provided
    if (req.query.className || req.query.search) {
      const studentQuery = {};
      if (req.query.className) studentQuery.className = req.query.className;
      if (req.query.search && req.query.search.trim()) {
        const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        studentQuery.$or = [
          { name: { $regex: escaped, $options: 'i' } },
          { studentId: { $regex: escaped, $options: 'i' } },
        ];
      }
      const matchedStudents = await Student.find(studentQuery, 'studentId');
      const studentIds = matchedStudents.map((s) => s.studentId);
      filter.studentId = { $in: studentIds };
    }

    const result = await attendanceService.getAttendance(filter, page, limit);
    return successResponse(res, result, 'Attendance records retrieved');
  } catch (error) {
    next(error);
  }
};

const getAttendanceById = async (req, res, next) => {
  try {
    const record = await Attendance.findById(req.params.id).lean();
    if (!record) {
      return errorResponse(res, 'Attendance record not found', 404);
    }
    const student = await Student.findOne({ studentId: record.studentId }).lean();
    const device = await Device.findOne({ deviceId: record.deviceId }).lean();

    return successResponse(res, {
      attendance: {
        ...record,
        student,
        device,
      },
    }, 'Attendance record details');
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

/**
 * Manual Attendance Correction with Audit Trail
 */
const correctAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { checkInTime, checkOutTime, status, reason } = req.body;

    if (!reason || !reason.trim()) {
      return errorResponse(res, 'A justification reason is strictly required for manual attendance correction', 400);
    }

    const record = await Attendance.findById(id);
    if (!record) {
      return errorResponse(res, 'Attendance record not found', 404);
    }

    const previousValues = {
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime,
      status: record.status,
    };

    const targetCheckIn = checkInTime ? new Date(checkInTime) : record.checkInTime;
    const targetCheckOut = checkOutTime !== undefined ? (checkOutTime ? new Date(checkOutTime) : null) : record.checkOutTime;

    if (targetCheckIn && isNaN(targetCheckIn.getTime())) {
      return errorResponse(res, 'Invalid check-in time format', 400);
    }
    if (targetCheckOut && isNaN(targetCheckOut.getTime())) {
      return errorResponse(res, 'Invalid check-out time format', 400);
    }
    if (targetCheckIn && targetCheckOut && targetCheckOut < targetCheckIn) {
      return errorResponse(res, 'Check-out time cannot be earlier than check-in time', 400);
    }

    const newValues = {};
    if (checkInTime) {
      record.checkInTime = targetCheckIn;
      newValues.checkInTime = record.checkInTime;
    }
    if (checkOutTime !== undefined) {
      record.checkOutTime = targetCheckOut;
      newValues.checkOutTime = record.checkOutTime;
    }
    if (status && ['present', 'late', 'half_day', 'absent'].includes(status)) {
      record.status = status;
      newValues.status = record.status;
    }

    record.auditLog.push({
      modifiedBy: req.user?.username || 'admin',
      action: 'manual_correction',
      previousValues,
      newValues,
      reason: reason.trim(),
      timestamp: new Date(),
    });

    await record.save();

    return successResponse(res, { attendance: record }, 'Attendance record corrected and audit log updated');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAttendance,
  getAttendanceById,
  getAttendanceByStudent,
  getAttendanceByDate,
  correctAttendance,
};
