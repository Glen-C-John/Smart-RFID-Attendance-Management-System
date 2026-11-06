const { DateTime } = require('luxon');
const InstitutionCalendar = require('../models/InstitutionCalendar');
const config = require('../config');
const { nowInTimezone } = require('../utils/timezone');

class CalendarService {
  /**
   * Retrieves or initializes the default institution calendar.
   */
  async getCalendar() {
    let calendar = await InstitutionCalendar.findOne();
    if (!calendar) {
      const now = nowInTimezone();
      const currentYear = now.year;
      calendar = await InstitutionCalendar.create({
        workingDays: [1, 2, 3, 4, 5], // Monday through Friday
        holidays: [
          { name: 'New Year Day', date: `${currentYear}-01-01`, type: 'public' },
          { name: 'Independence Day', date: `${currentYear}-08-15`, type: 'public' },
          { name: 'Republic Day', date: `${currentYear}-01-26`, type: 'public' },
          { name: 'Gandhi Jayanti', date: `${currentYear}-10-02`, type: 'public' },
        ],
        specialWorkingDays: [],
        semesters: [
          {
            name: `Semester 1 (${currentYear})`,
            startDate: `${currentYear}-01-01`,
            endDate: `${currentYear}-06-30`,
            isActive: now.month <= 6,
          },
          {
            name: `Semester 2 (${currentYear})`,
            startDate: `${currentYear}-07-01`,
            endDate: `${currentYear}-12-31`,
            isActive: now.month > 6,
          },
        ],
        lateCountsAsPresent: true,
        riskThresholdPercentage: 75,
        consecutiveAbsenceThreshold: 3,
        gracePeriodMinutes: 10,
      });
    }
    return calendar;
  }

  /**
   * Updates calendar configuration.
   */
  async updateCalendar(data) {
    let calendar = await InstitutionCalendar.findOne();
    if (!calendar) {
      calendar = new InstitutionCalendar(data);
    } else {
      Object.assign(calendar, data);
    }
    return await calendar.save();
  }

  /**
   * Computes an array of ISO date strings ('YYYY-MM-DD') that are designated working days
   * between startDate and endDate (inclusive), factoring in holidays and special working days.
   */
  async getWorkingDaysList(startDateStr, endDateStr, calendar = null) {
    if (!calendar) {
      calendar = await this.getCalendar();
    }

    const workingDaysSet = new Set(calendar.workingDays || [1, 2, 3, 4, 5]);
    const holidayDates = new Set((calendar.holidays || []).map((h) => h.date));
    const specialWorkingDates = new Set((calendar.specialWorkingDays || []).map((s) => s.date));

    const startDt = DateTime.fromISO(startDateStr, { zone: config.timezone });
    const endDt = DateTime.fromISO(endDateStr, { zone: config.timezone });

    const result = [];
    let current = startDt;

    while (current <= endDt) {
      const dateStr = current.toFormat('yyyy-MM-dd');
      const weekday = current.weekday; // 1=Mon ... 7=Sun

      if (specialWorkingDates.has(dateStr)) {
        // Designated as special working day regardless of day of week
        result.push(dateStr);
      } else if (holidayDates.has(dateStr)) {
        // Official holiday, not a working day
      } else if (workingDaysSet.has(weekday)) {
        // Regular working day
        result.push(dateStr);
      }

      current = current.plus({ days: 1 });
    }

    return result;
  }

  /**
   * Filters working days to only those applicable to a student:
   * - Ignores days before enrollment (createdAt or designated enrollmentDate)
   * - Excludes future dates or current date if unfinished and student not yet scanned
   */
  filterDaysForStudent(workingDays, student, options = {}) {
    if (!workingDays || workingDays.length === 0) return [];

    const now = nowInTimezone();
    const todayStr = now.toFormat('yyyy-MM-dd');
    const studentCreatedStr = student?.createdAt
      ? DateTime.fromJSDate(student.createdAt).setZone(config.timezone).toFormat('yyyy-MM-dd')
      : '1970-01-01';

    return workingDays.filter((dateStr) => {
      // Must be on or after enrollment/creation
      if (dateStr < studentCreatedStr) return false;

      // Do not count future dates
      if (dateStr > todayStr) return false;

      // Current in-progress day handling
      if (dateStr === todayStr && options.excludeTodayIfNotFinalized) {
        return false;
      }

      return true;
    });
  }

  /**
   * Adds a new holiday.
   */
  async addHoliday(holidayData) {
    const calendar = await this.getCalendar();
    calendar.holidays.push(holidayData);
    return await calendar.save();
  }

  /**
   * Deletes a holiday by ID.
   */
  async removeHoliday(holidayId) {
    const calendar = await this.getCalendar();
    calendar.holidays = calendar.holidays.filter((h) => h._id.toString() !== holidayId.toString());
    return await calendar.save();
  }

  /**
   * Adds or updates a semester.
   */
  async addSemester(semesterData) {
    const calendar = await this.getCalendar();
    if (semesterData.isActive) {
      calendar.semesters.forEach((s) => (s.isActive = false));
    }
    calendar.semesters.push(semesterData);
    return await calendar.save();
  }

  /**
   * Deletes a semester by ID.
   */
  async removeSemester(semesterId) {
    const calendar = await this.getCalendar();
    calendar.semesters = calendar.semesters.filter((s) => s._id.toString() !== semesterId.toString());
    return await calendar.save();
  }
}

module.exports = new CalendarService();
