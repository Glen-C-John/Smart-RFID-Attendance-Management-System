const riskService = require('../services/riskService');
const { successResponse, errorResponse } = require('../utils/response');

const getAlerts = async (req, res, next) => {
  try {
    const { classification, className, status } = req.query;
    const data = await riskService.getRiskAlerts({ classification, className, status });
    return successResponse(res, data);
  } catch (err) {
    next(err);
  }
};

const reviewAlert = async (req, res, next) => {
  try {
    const { id } = req.params; // studentId
    const { comment } = req.body;
    const adminUser = req.user?.username || 'admin';

    const alert = await riskService.reviewAlert({
      studentId: id,
      administrator: adminUser,
      comment,
    });

    return successResponse(res, { alert }, 'Attendance alert marked as reviewed');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAlerts,
  reviewAlert,
};
