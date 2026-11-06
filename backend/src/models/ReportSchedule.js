const mongoose = require('mongoose');

const reportScheduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Schedule title is required'],
      trim: true,
    },
    reportType: {
      type: String,
      required: [true, 'Report type is required'],
      enum: [
        'daily',
        'weekly',
        'monthly',
        'semester',
        'custom',
        'student',
        'class',
        'department',
        'absentee',
        'late_arrival',
        'below_threshold',
        'consecutive_absence',
        'device_activity',
        'audit_correction',
      ],
      default: 'daily',
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: [true, 'Frequency is required'],
      default: 'daily',
    },
    generationTime: {
      type: String, // 'HH:mm' 24-hr format
      default: '18:00',
      trim: true,
    },
    dayOfWeek: {
      type: Number, // 1=Mon ... 7=Sun (for weekly)
      default: 5,
    },
    dayOfMonth: {
      type: Number, // 1 ... 28 (for monthly)
      default: 1,
    },
    format: {
      type: String,
      enum: ['csv', 'xlsx', 'pdf'],
      default: 'csv',
    },
    filters: {
      className: { type: String, default: null },
      department: { type: String, default: null },
      studentId: { type: String, default: null },
      status: { type: String, default: null },
      threshold: { type: Number, default: 75 },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastRunAt: {
      type: Date,
      default: null,
    },
    nextRunAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ReportSchedule', reportScheduleSchema);
