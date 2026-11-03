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
      if (req.query.search) {
        studentQuery.$or = [
          { name: { $regex: req.query.search, $options: 'i' } },
          { studentId: { $regex: req.query.search, $options: 'i' } },
        ];
      }
      const matchedStudents = await Student.find(studentQuery, 'studentId');
      const studentIds = matchedStudents.map((s) => s.studentId);
      filter.studentId = { $in: studentIds };
    }

    const skip = (page - 1) * limit;
    const [rawRecords, total] = await Promise.all([
      Attendance.find(filter).sort({ checkInTime: -1 }).skip(skip).limit(limit).lean(),
      Attendance.countDocuments(filter),
    ]);

    // Populate student and device details for the table
    const sIds = [...new Set(rawRecords.map((r) => r.studentId))];
    const dIds = [...new Set(rawRecords.map((r) => r.deviceId))];

    const [students, devices] = await Promise.all([
      Student.find({ studentId: { $in: sIds } }, 'studentId name className department').lean(),
      Device.find({ deviceId: { $in: dIds } }, 'deviceId deviceName location').lean(),
    ]);

    const sMap = Object.fromEntries(students.map((s) => [s.studentId, s]));
    const dMap = Object.fromEntries(devices.map((d) => [d.deviceId, d]));

    const records = rawRecords.map((r) => ({
      ...r,
      studentName: sMap[r.studentId]?.name || 'Unknown',
      className: sMap[r.studentId]?.className || '-',
      department: sMap[r.studentId]?.department || '-',
      deviceName: dMap[r.deviceId]?.deviceName || r.deviceId,
      location: dMap[r.deviceId]?.location || 'Main Gate',
    }));

    return successResponse(res, {
      records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }, 'Attendance records retrieved');
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

    const newValues = {};
    if (checkInTime) {
      record.checkInTime = new Date(checkInTime);
      newValues.checkInTime = record.checkInTime;
    }
    if (checkOutTime !== undefined) {
      record.checkOutTime = checkOutTime ? new Date(checkOutTime) : null;
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
