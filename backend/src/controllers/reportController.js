const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Device = require('../models/Device');
const { nowInTimezone, formatTimeDisplay } = require('../utils/timezone');
const { successResponse, errorResponse } = require('../utils/response');

const generateReport = async (req, res, next) => {
  try {
    const { type = 'daily', date, startDate, endDate, studentId, className } = req.query;
    const now = nowInTimezone();

    let queryStartDate = startDate;
    let queryEndDate = endDate;

    if (type === 'daily') {
      const targetDate = date || now.toFormat('yyyy-MM-dd');
      queryStartDate = targetDate;
      queryEndDate = targetDate;
    } else if (type === 'weekly' && (!queryStartDate || !queryEndDate)) {
      queryEndDate = now.toFormat('yyyy-MM-dd');
      queryStartDate = now.minus({ days: 6 }).toFormat('yyyy-MM-dd');
    } else if (type === 'monthly' && (!queryStartDate || !queryEndDate)) {
      queryStartDate = now.startOf('month').toFormat('yyyy-MM-dd');
      queryEndDate = now.endOf('month').toFormat('yyyy-MM-dd');
    }

    const attendanceFilter = {
      attendanceDate: { $gte: queryStartDate, $lte: queryEndDate },
    };

    if (studentId) {
      attendanceFilter.studentId = studentId.toUpperCase();
    }

    if (className) {
      const classStudents = await Student.find({ className: className }, 'studentId');
      attendanceFilter.studentId = { $in: classStudents.map((s) => s.studentId) };
    }

    const [rawRecords, totalActiveStudents] = await Promise.all([
      Attendance.find(attendanceFilter).sort({ attendanceDate: -1, checkInTime: -1 }).lean(),
      Student.countDocuments(className ? { className, status: 'active' } : { status: 'active' }),
    ]);

    // Populate metadata
    const sIds = [...new Set(rawRecords.map((r) => r.studentId))];
    const dIds = [...new Set(rawRecords.map((r) => r.deviceId))];

    const [students, devices] = await Promise.all([
      Student.find({ studentId: { $in: sIds } }, 'studentId name className department').lean(),
      Device.find({ deviceId: { $in: dIds } }, 'deviceId deviceName location').lean(),
    ]);

    const sMap = Object.fromEntries(students.map((s) => [s.studentId, s]));
    const dMap = Object.fromEntries(devices.map((d) => [d.deviceId, d]));

    const records = rawRecords.map((r) => ({
      _id: r._id,
      studentId: r.studentId,
      studentName: sMap[r.studentId]?.name || 'Unknown',
      className: sMap[r.studentId]?.className || '-',
      department: sMap[r.studentId]?.department || '-',
      attendanceDate: r.attendanceDate,
      checkInTime: r.checkInTime ? formatTimeDisplay(r.checkInTime) : null,
      checkOutTime: r.checkOutTime ? formatTimeDisplay(r.checkOutTime) : null,
      status: r.status,
      cardUid: r.cardUid,
      deviceId: r.deviceId,
      deviceName: dMap[r.deviceId]?.deviceName || r.deviceId,
    }));

    const totalSessions = records.length;
    const presentSessions = records.filter((r) => r.status === 'present' || r.status === 'late').length;
    const lateSessions = records.filter((r) => r.status === 'late').length;
    const onTimeSessions = records.filter((r) => r.status === 'present').length;

    const summary = {
      reportType: type,
      period: {
        startDate: queryStartDate,
        endDate: queryEndDate,
      },
      totalActiveStudents,
      totalSessions,
      presentSessions,
      onTimeSessions,
      lateSessions,
      attendanceRate: totalActiveStudents > 0 ? Math.round((presentSessions / (totalActiveStudents * (totalSessions > 0 ? 1 : 0) || 1)) * 100) : 0,
      generatedAt: now.toISO(),
    };

    return successResponse(res, { summary, records }, 'Report generated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateReport,
};

