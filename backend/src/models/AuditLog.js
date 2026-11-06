const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    administrator: {
      type: String,
      default: 'admin',
      trim: true,
      index: true,
    },
    operation: {
      type: String,
      required: [true, 'Operation type is required'],
      trim: true,
      index: true,
    },
    recordType: {
      type: String,
      required: [true, 'Record type is required'],
      trim: true,
      index: true,
    },
    recordId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    reason: {
      type: String,
      trim: true,
      default: 'Administrative update',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ operation: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
