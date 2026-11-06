const fs = require('fs');
const { DateTime } = require('luxon');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const GeneratedReport = require('../models/GeneratedReport');
const attendanceService = require('../services/attendanceService');
const reportBuilderService = require('../services/reportBuilderService');
const { nowInTimezone, formatTimeDisplay } = require('../utils/timezone');
const { successResponse, errorResponse } = require('../utils/response');

const MAX_REPORT_RECORDS = 5000;

/**
 * Phase 2 Standard Report Generator (Backward Compatible GET /api/v1/reports)
 */
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

/**
 * Phase 3 Advanced Multi-Type Report Builder & Exporter (POST /api/v1/reports/generate)
 */
const buildReport = async (req, res, next) => {
  try {
    const {
      reportType = 'daily',
      startDate,
      endDate,
      studentId,
      className,
      department,
      status,
      threshold,
      deviceId,
      format = 'preview', // 'preview', 'xlsx', 'csv'
    } = req.body;

    const reportData = await reportBuilderService.compileReportData({
      reportType,
      startDate,
      endDate,
      studentId,
      className,
      department,
      status,
      threshold: Number(threshold) || 75,
      deviceId,
    });

    if (format === 'preview') {
      return successResponse(res, { reportData }, 'Report preview compiled');
    }

    let exportResult;
    if (format === 'xlsx') {
      exportResult = await reportBuilderService.exportToExcel(reportData);
    } else {
      exportResult = await reportBuilderService.exportToCsv(reportData);
    }

    const saved = await GeneratedReport.create({
      title: reportData.title,
      reportType,
      format,
      period: reportData.period,
      filters: { studentId, className, department, status, threshold },
      recordCount: reportData.totalRecords,
      fileSize: exportResult.fileSize,
      filePath: exportResult.filePath,
      fileName: exportResult.fileName,
      generatedBy: req.user?.username || 'admin',
    });

    return successResponse(
      res,
      {
        reportId: saved._id,
        fileName: saved.fileName,
        fileSize: saved.fileSize,
        format: saved.format,
        downloadUrl: `/api/v1/reports/${saved._id}/download`,
        summary: reportData.summary,
      },
      'Report generated and ready for download'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Lists Generated Report History (GET /api/v1/reports/history)
 */
const getHistory = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const history = await GeneratedReport.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return successResponse(res, { history });
  } catch (error) {
    next(error);
  }
};

/**
 * Securely Streams Report File Download (GET /api/v1/reports/:id/download)
 */
const downloadReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await GeneratedReport.findById(id).lean();
    if (!report || !report.filePath) {
      return errorResponse(res, 'Report file not found', 404);
    }

    if (!fs.existsSync(report.filePath)) {
      return errorResponse(res, 'Physical report file has been archived or removed from server storage', 404);
    }

    res.download(report.filePath, report.fileName);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateReport,
  buildReport,
  getHistory,
  downloadReport,
};
