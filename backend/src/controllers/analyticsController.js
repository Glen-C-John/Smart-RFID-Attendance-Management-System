const analyticsService = require('../services/analyticsService');
const riskService = require('../services/riskService');
const { successResponse, errorResponse } = require('../utils/response');

const getOverview = async (req, res, next) => {
  try {
    const { period, startDate, endDate, className, department } = req.query;
    const overview = await analyticsService.getOverview({
      period,
      startDate,
      endDate,
      className,
      department,
    });
    return successResponse(res, overview);
  } catch (err) {
    next(err);
  }
};

const getTrends = async (req, res, next) => {
  try {
    const { interval, startDate, endDate, className, department } = req.query;
    const trends = await analyticsService.getTrends({
      interval,
      startDate,
      endDate,
      className,
      department,
    });
    return successResponse(res, trends);
  } catch (err) {
    next(err);
  }
};

const getStudentAnalytics = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const analytics = await analyticsService.getStudentAnalytics(studentId);
    return successResponse(res, analytics);
  } catch (err) {
    next(err);
  }
};

const getClassesAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, classes } = req.query;
    const classNames = classes ? classes.split(',').map((c) => c.trim()) : [];
    const classData = await analyticsService.getClassesAnalytics({
      startDate,
      endDate,
      classNames,
    });
    return successResponse(res, classData);
  } catch (err) {
    next(err);
  }
};

const getHeatmap = async (req, res, next) => {
  try {
    const { startDate, endDate, className, studentId } = req.query;
    const heatmap = await analyticsService.getHeatmapMatrix({
      startDate,
      endDate,
      className,
      studentId,
    });
    return successResponse(res, heatmap);
  } catch (err) {
    next(err);
  }
};

const getPunctuality = async (req, res, next) => {
  try {
    const { startDate, endDate, className } = req.query;
    const punctuality = await analyticsService.getPunctualityAnalytics({
      startDate,
      endDate,
      className,
    });
    return successResponse(res, punctuality);
  } catch (err) {
    next(err);
  }
};

const getDataQuality = async (req, res, next) => {
  try {
    const anomalies = await analyticsService.getDataQualityAnomalies();
    return successResponse(res, anomalies);
  } catch (err) {
    next(err);
  }
};

const getRiskOverview = async (req, res, next) => {
  try {
    const { classification, className, status } = req.query;
    const riskData = await riskService.getRiskAlerts({
      classification,
      className,
      status,
    });
    return successResponse(res, riskData);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOverview,
  getTrends,
  getStudentAnalytics,
  getClassesAnalytics,
  getHeatmap,
  getPunctuality,
  getDataQuality,
  getRiskOverview,
};
