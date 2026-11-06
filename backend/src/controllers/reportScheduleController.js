const ReportSchedule = require('../models/ReportSchedule');
const reportBuilderService = require('../services/reportBuilderService');
const auditService = require('../services/auditService');
const { successResponse, errorResponse } = require('../utils/response');

const getSchedules = async (req, res, next) => {
  try {
    const schedules = await ReportSchedule.find().sort({ createdAt: -1 }).lean();
    return successResponse(res, { schedules });
  } catch (err) {
    next(err);
  }
};

const createSchedule = async (req, res, next) => {
  try {
    const { title, reportType, frequency, generationTime, dayOfWeek, dayOfMonth, format, filters } = req.body;
    if (!title || !reportType || !frequency) {
      return errorResponse(res, 'Title, reportType, and frequency are required', 400);
    }

    const schedule = await ReportSchedule.create({
      title,
      reportType,
      frequency,
      generationTime: generationTime || '18:00',
      dayOfWeek: dayOfWeek || 5,
      dayOfMonth: dayOfMonth || 1,
      format: format || 'xlsx',
      filters: filters || {},
    });

    await auditService.logAction({
      administrator: req.user?.username || 'admin',
      operation: 'create_report_schedule',
      recordType: 'ReportSchedule',
      recordId: schedule._id,
      newValue: schedule.toObject(),
      reason: `Created automated report schedule: ${title}`,
    });

    return successResponse(res, { schedule }, 'Report schedule created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const updateSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schedule = await ReportSchedule.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!schedule) {
      return errorResponse(res, 'Report schedule not found', 404);
    }

    await auditService.logAction({
      administrator: req.user?.username || 'admin',
      operation: 'update_report_schedule',
      recordType: 'ReportSchedule',
      recordId: id,
      newValue: req.body,
      reason: `Updated automated schedule settings: ${schedule.title}`,
    });

    return successResponse(res, { schedule }, 'Report schedule updated');
  } catch (err) {
    next(err);
  }
};

const deleteSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schedule = await ReportSchedule.findByIdAndDelete(id);
    if (!schedule) {
      return errorResponse(res, 'Report schedule not found', 404);
    }

    await auditService.logAction({
      administrator: req.user?.username || 'admin',
      operation: 'delete_report_schedule',
      recordType: 'ReportSchedule',
      recordId: id,
      reason: `Deleted report schedule: ${schedule.title}`,
    });

    return successResponse(res, null, 'Report schedule deleted');
  } catch (err) {
    next(err);
  }
};

const runScheduleNow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schedule = await ReportSchedule.findById(id);
    if (!schedule) {
      return errorResponse(res, 'Report schedule not found', 404);
    }

    const reportData = await reportBuilderService.compileReportData({
      reportType: schedule.reportType,
      ...schedule.filters,
    });

    let exportResult;
    if (schedule.format === 'xlsx') {
      exportResult = await reportBuilderService.exportToExcel(reportData);
    } else {
      exportResult = await reportBuilderService.exportToCsv(reportData);
    }

    const GeneratedReport = require('../models/GeneratedReport');
    const generated = await GeneratedReport.create({
      title: schedule.title,
      reportType: schedule.reportType,
      scheduleId: schedule._id,
      format: schedule.format,
      period: reportData.period,
      filters: schedule.filters,
      recordCount: reportData.totalRecords,
      fileSize: exportResult.fileSize,
      filePath: exportResult.filePath,
      fileName: exportResult.fileName,
      generatedBy: req.user?.username || 'admin',
    });

    schedule.lastRunAt = new Date();
    await schedule.save();

    return successResponse(res, { generatedReport: generated }, 'Report generated immediately');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  runScheduleNow,
};
