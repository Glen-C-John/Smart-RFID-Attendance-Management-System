const auditService = require('../services/auditService');
const { successResponse, errorResponse } = require('../utils/response');

const getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, operation, recordType, administrator, startDate, endDate } = req.query;
    const result = await auditService.getLogs({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 50,
      operation,
      recordType,
      administrator,
      startDate,
      endDate,
    });
    return successResponse(res, result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAuditLogs,
};
