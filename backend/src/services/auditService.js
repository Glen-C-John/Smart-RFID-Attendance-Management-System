const AuditLog = require('../models/AuditLog');

class AuditService {
  /**
   * Records an administrative action in the immutable audit log.
   */
  async logAction({
    administrator = 'admin',
    operation,
    recordType,
    recordId = null,
    previousValue = null,
    newValue = null,
    reason = 'Administrative update',
  }) {
    try {
      return await AuditLog.create({
        administrator,
        operation,
        recordType,
        recordId: recordId ? String(recordId) : null,
        previousValue,
        newValue,
        reason,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error('[AuditService Error]: Failed to write audit log:', err.message);
      // Non-blocking: Do not crash business operations if audit write fails
      return null;
    }
  }

  /**
   * Retrieves paginated audit logs with search and filters.
   */
  async getLogs({ page = 1, limit = 50, operation, recordType, administrator, startDate, endDate }) {
    const filter = {};
    if (operation) filter.operation = operation;
    if (recordType) filter.recordType = recordType;
    if (administrator) filter.administrator = administrator;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
    const safeLimit = Math.min(100, Math.max(1, limit));

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(safeLimit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    return {
      logs,
      pagination: {
        page: Number(page),
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit) || 1,
      },
    };
  }
}

module.exports = new AuditService();
