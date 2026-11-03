const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    modifiedBy: {
      type: String,
      default: 'admin',
    },
    action: {
      type: String,
      default: 'manual_correction',
    },
    previousValues: {
      type: mongoose.Schema.Types.Mixed,
    },
    newValues: {
      type: mongoose.Schema.Types.Mixed,
    },
    reason: {
      type: String,
      required: [true, 'Modification reason is required'],
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: [true, 'Student ID reference is required'],
      ref: 'Student',
      trim: true,
      uppercase: true,
      index: true,
    },
    cardUid: {
      type: String,
      required: [true, 'Card UID is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: [true, 'Device ID is required'],
      trim: true,
      index: true,
    },
    attendanceDate: {
      type: String,
      required: [true, 'Attendance date (YYYY-MM-DD) is required'],
      trim: true,
      index: true,
    },
    checkInTime: {
      type: Date,
      required: [true, 'Check-in time is required'],
    },
    checkOutTime: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['present', 'late', 'half_day', 'absent'],
      default: 'present',
      index: true,
    },
    eventId: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
      description: 'Client-generated UUID for offline sync idempotency',
    },
    auditLog: [auditLogSchema],
  },
  {
    timestamps: true,
  }
);

// One attendance record per student per day
attendanceSchema.index({ studentId: 1, attendanceDate: 1 }, { unique: true });
attendanceSchema.index({ attendanceDate: 1, status: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
