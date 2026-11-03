const { DateTime } = require('luxon');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const attendanceService = require('../services/attendanceService');
const { nowInTimezone, formatTimeDisplay } = require('../utils/timezone');
const { successResponse, errorResponse } = require('../utils/response');

const MAX_REPORT_RECORDS = 5000;

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
      Attendance.find(attendanceFilter)
        .sort({ attendanceDate: -1, checkInTime: -1 })
        .limit(MAX_REPORT_RECORDS)
        .lean(),
      Student.countDocuments(className ? { className, status: 'active' } : { status: 'active' }),
    ]);

    const enriched = await attendanceService.enrichAttendanceRecords(rawRecords);
    const records = enriched.map((r) => ({
      ...r,
      checkInTime: r.checkInTime ? formatTimeDisplay(r.checkInTime) : null,
      checkOutTime: r.checkOutTime ? formatTimeDisplay(r.checkOutTime) : null,
    }));

    const totalSessions = records.length;
    const presentSessions = records.filter((r) => r.status === 'present' || r.status === 'late').length;
    const lateSessions = records.filter((r) => r.status === 'late').length;
    const onTimeSessions = records.filter((r) => r.status === 'present').length;

    // Calculate calendar days in period for accurate attendance rate
    const startDt = DateTime.fromISO(queryStartDate);
    const endDt = DateTime.fromISO(queryEndDate);
    const periodDays = Math.max(1, Math.round(endDt.diff(startDt, 'days').days) + 1);
    const targetStudents = studentId ? 1 : totalActiveStudents;
    const maxPossibleSessions = targetStudents * periodDays;
    const attendanceRate = maxPossibleSessions > 0
      ? Math.min(100, Math.round((presentSessions / maxPossibleSessions) * 100))
      : 0;

    const summary = {
      reportType: type,
      period: {
        startDate: queryStartDate,
        endDate: queryEndDate,
        days: periodDays,
      },
      totalActiveStudents,
      totalSessions,
      presentSessions,
      onTimeSessions,
      lateSessions,
      attendanceRate,
      recordLimit: MAX_REPORT_RECORDS,
      isTruncated: rawRecords.length === MAX_REPORT_RECORDS,
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

