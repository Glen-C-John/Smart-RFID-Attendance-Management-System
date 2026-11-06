const mongoose = require('mongoose');

const attendanceAlertSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: [true, 'Student ID is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    studentName: {
      type: String,
      trim: true,
      default: '',
    },
    className: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    riskClassification: {
      type: String,
      enum: ['normal', 'needs_attention', 'at_risk', 'critical'],
      required: true,
      index: true,
    },
    reasons: [
      {
        type: String,
        trim: true,
      },
    ],
    metrics: {
      overallAttendanceRate: { type: Number, default: 0 },
      last30DaysRate: { type: Number, default: 0 },
      consecutiveAbsences: { type: Number, default: 0 },
      repeatedLates30Days: { type: Number, default: 0 },
      rateDeltaPreviousPeriod: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['active', 'reviewed', 'dismissed'],
      default: 'active',
      index: true,
    },
    reviewedBy: {
      type: String,
      trim: true,
      default: null,
    },
    reviewComment: {
      type: String,
      trim: true,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

attendanceAlertSchema.index({ studentId: 1, status: 1 });
attendanceAlertSchema.index({ riskClassification: 1, status: 1 });

module.exports = mongoose.model('AttendanceAlert', attendanceAlertSchema);
