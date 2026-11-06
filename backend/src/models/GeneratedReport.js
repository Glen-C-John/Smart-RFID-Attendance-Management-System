const mongoose = require('mongoose');

const generatedReportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    reportType: {
      type: String,
      required: true,
      trim: true,
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReportSchedule',
      default: null,
      index: true,
    },
    format: {
      type: String,
      enum: ['csv', 'xlsx', 'pdf'],
      required: true,
    },
    period: {
      startDate: { type: String, required: true },
      endDate: { type: String, required: true },
    },
    filters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    recordCount: {
      type: Number,
      default: 0,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    generatedBy: {
      type: String,
      default: 'system',
    },
  },
  {
    timestamps: true,
  }
);

generatedReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('GeneratedReport', generatedReportSchema);
