const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Holiday name is required'],
      trim: true,
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: [true, 'Holiday date is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['public', 'institution', 'emergency'],
      default: 'public',
    },
  },
  { _id: true }
);

const specialWorkingDaySchema = new mongoose.Schema(
  {
    date: {
      type: String, // 'YYYY-MM-DD'
      required: [true, 'Date is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: 'Special Working Day',
    },
  },
  { _id: true }
);

const semesterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Semester name is required'],
      trim: true,
    },
    startDate: {
      type: String, // 'YYYY-MM-DD'
      required: [true, 'Start date is required'],
      trim: true,
    },
    endDate: {
      type: String, // 'YYYY-MM-DD'
      required: [true, 'End date is required'],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const institutionCalendarSchema = new mongoose.Schema(
  {
    workingDays: {
      type: [Number], // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
      default: [1, 2, 3, 4, 5],
    },
    holidays: [holidaySchema],
    specialWorkingDays: [specialWorkingDaySchema],
    semesters: [semesterSchema],
    lateCountsAsPresent: {
      type: Boolean,
      default: true,
    },
    riskThresholdPercentage: {
      type: Number,
      default: 75,
      min: 1,
      max: 100,
    },
    consecutiveAbsenceThreshold: {
      type: Number,
      default: 3,
      min: 1,
    },
    gracePeriodMinutes: {
      type: Number,
      default: 10,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('InstitutionCalendar', institutionCalendarSchema);
