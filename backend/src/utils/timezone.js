const { DateTime } = require('luxon');
const config = require('../config');

/**
 * Returns current DateTime object in the application timezone.
 */
const nowInTimezone = (tz = config.timezone) => {
  return DateTime.now().setZone(tz);
};

/**
 * Converts a JS Date or ISO string into a DateTime object in the application timezone.
 */
const toTimezone = (dateOrIso, tz = config.timezone) => {
  if (!dateOrIso) return nowInTimezone(tz);
  if (dateOrIso instanceof Date) {
    return DateTime.fromJSDate(dateOrIso).setZone(tz);
  }
  return DateTime.fromISO(dateOrIso, { zone: tz });
};

/**
 * Returns formatted date string 'YYYY-MM-DD' for attendance records.
 */
const getAttendanceDateString = (dateOrIso = null, tz = config.timezone) => {
  return toTimezone(dateOrIso, tz).toFormat('yyyy-MM-dd');
};

/**
 * Returns formatted display time e.g. '09:05 AM'.
 */
const formatTimeDisplay = (dateOrIso = null, tz = config.timezone) => {
  return toTimezone(dateOrIso, tz).toFormat('hh:mm a');
};

/**
 * Checks if a given time is after the late threshold time (e.g. '09:30').
 * @param {Date|string} time
 * @param {string} lateThresholdStr - 'HH:mm'
 * @param {string} tz
 */
const isLateArrival = (time, lateThresholdStr = config.attendance.lateThresholdTime, tz = config.timezone) => {
  const dt = toTimezone(time, tz);
  const [thresholdHour, thresholdMinute] = lateThresholdStr.split(':').map(Number);
  
  const thresholdDt = dt.set({
    hour: thresholdHour,
    minute: thresholdMinute,
    second: 0,
    millisecond: 0,
  });

  return dt > thresholdDt;
};

/**
 * Returns the difference in minutes between two dates.
 */
const diffInMinutes = (dateLater, dateEarlier) => {
  const dtLater = DateTime.fromJSDate(dateLater instanceof Date ? dateLater : new Date(dateLater));
  const dtEarlier = DateTime.fromJSDate(dateEarlier instanceof Date ? dateEarlier : new Date(dateEarlier));
  return dtLater.diff(dtEarlier, 'minutes').minutes;
};

module.exports = {
  nowInTimezone,
  toTimezone,
  getAttendanceDateString,
  formatTimeDisplay,
  isLateArrival,
  diffInMinutes,
};

