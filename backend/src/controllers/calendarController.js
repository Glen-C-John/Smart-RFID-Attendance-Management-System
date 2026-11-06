const calendarService = require('../services/calendarService');
const auditService = require('../services/auditService');
const { successResponse, errorResponse } = require('../utils/response');

const getCalendar = async (req, res, next) => {
  try {
    const calendar = await calendarService.getCalendar();
    return successResponse(res, { calendar });
  } catch (err) {
    next(err);
  }
};

const updateCalendar = async (req, res, next) => {
  try {
    const prevCalendar = await calendarService.getCalendar();
    const updated = await calendarService.updateCalendar(req.body);

    await auditService.logAction({
      administrator: req.user?.username || 'admin',
      operation: 'update_calendar_settings',
      recordType: 'InstitutionCalendar',
      recordId: updated._id,
      previousValue: prevCalendar.toObject(),
      newValue: updated.toObject(),
      reason: req.body.reason || 'Updated institution working schedule or thresholds',
    });

    return successResponse(res, { calendar: updated }, 'Calendar settings updated successfully');
  } catch (err) {
    next(err);
  }
};

const addHoliday = async (req, res, next) => {
  try {
    const { name, date, type } = req.body;
    if (!name || !date) {
      return errorResponse(res, 'Holiday name and date (YYYY-MM-DD) are required', 400);
    }

    const updated = await calendarService.addHoliday({ name, date, type });

    await auditService.logAction({
      administrator: req.user?.username || 'admin',
      operation: 'add_holiday',
      recordType: 'InstitutionCalendar',
      recordId: updated._id,
      newValue: { name, date, type },
      reason: `Added holiday: ${name} on ${date}`,
    });

    return successResponse(res, { calendar: updated }, 'Holiday added successfully', 201);
  } catch (err) {
    next(err);
  }
};

const removeHoliday = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await calendarService.removeHoliday(id);

    await auditService.logAction({
      administrator: req.user?.username || 'admin',
      operation: 'remove_holiday',
      recordType: 'InstitutionCalendar',
      recordId: id,
      reason: 'Deleted holiday from academic calendar',
    });

    return successResponse(res, { calendar: updated }, 'Holiday removed successfully');
  } catch (err) {
    next(err);
  }
};

const addSemester = async (req, res, next) => {
  try {
    const { name, startDate, endDate, isActive } = req.body;
    if (!name || !startDate || !endDate) {
      return errorResponse(res, 'Semester name, start date, and end date are required', 400);
    }

    const updated = await calendarService.addSemester({ name, startDate, endDate, isActive });
    return successResponse(res, { calendar: updated }, 'Semester configured successfully', 201);
  } catch (err) {
    next(err);
  }
};

const removeSemester = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await calendarService.removeSemester(id);
    return successResponse(res, { calendar: updated }, 'Semester removed successfully');
  } catch (err) {
    next(err);
  }
};

const getWorkingDays = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return errorResponse(res, 'startDate and endDate query parameters are required', 400);
    }
    const days = await calendarService.getWorkingDaysList(startDate, endDate);
    return successResponse(res, { workingDays: days, count: days.length });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCalendar,
  updateCalendar,
  addHoliday,
  removeHoliday,
  addSemester,
  removeSemester,
  getWorkingDays,
};
