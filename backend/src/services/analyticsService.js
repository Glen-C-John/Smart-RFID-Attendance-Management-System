const { DateTime } = require('luxon');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const RfidCard = require('../models/RfidCard');
const Setting = require('../models/Setting');
const calendarService = require('./calendarService');
const config = require('../config');
const { nowInTimezone, formatTimeDisplay } = require('../utils/timezone');

class AnalyticsService {
  /**
   * Resolves date range from preset period types or custom boundaries.
   */
  resolvePeriod(type = 'last30', customStart = null, customEnd = null) {
    const now = nowInTimezone();

    // If explicit boundaries are passed, prioritize them
    if (customStart && customEnd) {
      const diffDays = Math.max(1, Math.round(DateTime.fromISO(customEnd).diff(DateTime.fromISO(customStart), 'days').days) + 1);
      const prevEndDate = DateTime.fromISO(customStart).minus({ days: 1 }).toFormat('yyyy-MM-dd');
      const prevStartDate = DateTime.fromISO(prevEndDate).minus({ days: diffDays - 1 }).toFormat('yyyy-MM-dd');
      return { startDate: customStart, endDate: customEnd, prevStartDate, prevEndDate };
    }

    let startDate;
    let endDate = now.toFormat('yyyy-MM-dd');
    let prevStartDate;
    let prevEndDate;

    switch (type) {
      case 'today':
        startDate = now.toFormat('yyyy-MM-dd');
        endDate = startDate;
        prevStartDate = now.minus({ days: 1 }).toFormat('yyyy-MM-dd');
        prevEndDate = prevStartDate;
        break;
      case 'last7':
        startDate = now.minus({ days: 6 }).toFormat('yyyy-MM-dd');
        prevStartDate = now.minus({ days: 13 }).toFormat('yyyy-MM-dd');
        prevEndDate = now.minus({ days: 7 }).toFormat('yyyy-MM-dd');
        break;
      case 'last30':
        startDate = now.minus({ days: 29 }).toFormat('yyyy-MM-dd');
        prevStartDate = now.minus({ days: 59 }).toFormat('yyyy-MM-dd');
        prevEndDate = now.minus({ days: 30 }).toFormat('yyyy-MM-dd');
        break;
      case 'thisMonth':
        startDate = now.startOf('month').toFormat('yyyy-MM-dd');
        endDate = now.toFormat('yyyy-MM-dd');
        prevStartDate = now.minus({ months: 1 }).startOf('month').toFormat('yyyy-MM-dd');
        prevEndDate = now.minus({ months: 1 }).endOf('month').toFormat('yyyy-MM-dd');
        break;
      case 'lastMonth':
        startDate = now.minus({ months: 1 }).startOf('month').toFormat('yyyy-MM-dd');
        endDate = now.minus({ months: 1 }).endOf('month').toFormat('yyyy-MM-dd');
        prevStartDate = now.minus({ months: 2 }).startOf('month').toFormat('yyyy-MM-dd');
        prevEndDate = now.minus({ months: 2 }).endOf('month').toFormat('yyyy-MM-dd');
        break;
      case 'custom':
        startDate = customStart || now.minus({ days: 29 }).toFormat('yyyy-MM-dd');
        endDate = customEnd || now.toFormat('yyyy-MM-dd');
        const diffDays = Math.max(1, Math.round(DateTime.fromISO(endDate).diff(DateTime.fromISO(startDate), 'days').days) + 1);
        prevEndDate = DateTime.fromISO(startDate).minus({ days: 1 }).toFormat('yyyy-MM-dd');
        prevStartDate = DateTime.fromISO(prevEndDate).minus({ days: diffDays - 1 }).toFormat('yyyy-MM-dd');
        break;
      default:
        startDate = now.minus({ days: 29 }).toFormat('yyyy-MM-dd');
        prevStartDate = now.minus({ days: 59 }).toFormat('yyyy-MM-dd');
        prevEndDate = now.minus({ days: 30 }).toFormat('yyyy-MM-dd');
    }

    return { startDate, endDate, prevStartDate, prevEndDate };
  }

  /**
   * Comprehensive Overview with KPIs, Working-Day Calculations, and Comparisons.
   */
  async getOverview({ period = 'last30', startDate: cStart, endDate: cEnd, className, department }) {
    const { startDate, endDate, prevStartDate, prevEndDate } = this.resolvePeriod(period, cStart, cEnd);
    const calendar = await calendarService.getCalendar();

    // Student filter
    const studentFilter = { status: 'active' };
    if (className) studentFilter.className = className;
    if (department) studentFilter.department = department;

    const [activeStudents, totalStudentsCount, workingDaysCurrent, workingDaysPrev] = await Promise.all([
      Student.find(studentFilter, 'studentId className department createdAt').lean(),
      Student.countDocuments(className || department ? studentFilter : {}),
      calendarService.getWorkingDaysList(startDate, endDate, calendar),
      calendarService.getWorkingDaysList(prevStartDate, prevEndDate, calendar),
    ]);

    const activeStudentIds = activeStudents.map((s) => s.studentId);
    const totalActiveStudents = activeStudents.length;

    // Aggregate Current Period
    const currentAttendance = await Attendance.aggregate([
      {
        $match: {
          attendanceDate: { $gte: startDate, $lte: endDate },
          studentId: { $in: activeStudentIds },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Aggregate Previous Period for delta calculations
    const prevAttendance = await Attendance.aggregate([
      {
        $match: {
          attendanceDate: { $gte: prevStartDate, $lte: prevEndDate },
          studentId: { $in: activeStudentIds },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = (arr) => Object.fromEntries(arr.map((x) => [x._id, x.count]));
    const currCounts = countMap(currentAttendance);
    const prevCounts = countMap(prevAttendance);

    const currPresent = (currCounts['present'] || 0) + (currCounts['late'] || 0) + (currCounts['half_day'] || 0);
    const currLate = currCounts['late'] || 0;
    const currOnTime = currCounts['present'] || 0;
    const currSessions = Object.values(currCounts).reduce((a, b) => a + b, 0);

    const prevPresent = (prevCounts['present'] || 0) + (prevCounts['late'] || 0) + (prevCounts['half_day'] || 0);

    const totalExpectedSessions = totalActiveStudents * workingDaysCurrent.length;
    const totalPrevExpected = totalActiveStudents * workingDaysPrev.length;

    const attendanceRate = totalExpectedSessions > 0
      ? Math.min(100, Math.round((currPresent / totalExpectedSessions) * 100))
      : 0;

    const prevAttendanceRate = totalPrevExpected > 0
      ? Math.min(100, Math.round((prevPresent / totalPrevExpected) * 100))
      : 0;

    const rateDelta = attendanceRate - prevAttendanceRate;
    const totalAbsentDays = Math.max(0, totalExpectedSessions - currPresent);

    // Identify Student Performance Brackets
    // Query attendance grouped by student to compute individual rates in this period
    const studentAttendance = await Attendance.aggregate([
      {
        $match: {
          attendanceDate: { $gte: startDate, $lte: endDate },
          studentId: { $in: activeStudentIds },
          status: { $in: ['present', 'late', 'half_day'] },
        },
      },
      {
        $group: {
          _id: '$studentId',
          presentDays: { $sum: 1 },
        },
      },
    ]);

    const studentPresentMap = Object.fromEntries(studentAttendance.map((s) => [s._id, s.presentDays]));
    let excellentCount = 0; // >= 90%
    let poorCount = 0;      // < 75%

    const workingDaysCount = Math.max(1, workingDaysCurrent.length);
    activeStudents.forEach((student) => {
      const p = studentPresentMap[student.studentId] || 0;
      const rate = Math.round((p / workingDaysCount) * 100);
      if (rate >= 90) excellentCount++;
      if (rate < 75) poorCount++;
    });

    return {
      period: {
        type: period,
        startDate,
        endDate,
        workingDays: workingDaysCurrent.length,
        previousPeriod: {
          startDate: prevStartDate,
          endDate: prevEndDate,
          workingDays: workingDaysPrev.length,
        },
      },
      kpis: {
        totalRegisteredStudents: totalStudentsCount,
        totalActiveStudents,
        averageAttendancePercentage: attendanceRate,
        previousAttendancePercentage: prevAttendanceRate,
        attendanceImprovementDelta: rateDelta, // e.g. +5 or -3
        totalSessions: currSessions,
        totalPresentDays: currPresent,
        totalAbsentDays,
        totalLateArrivals: currLate,
        totalOnTimeArrivals: currOnTime,
        excellentAttendanceCount: excellentCount,
        poorAttendanceCount: poorCount,
      },
    };
  }

  /**
   * Attendance Trends with Daily, Weekly, and Monthly grouping options.
   */
  async getTrends({ interval = 'daily', startDate: cStart, endDate: cEnd, className, department }) {
    const { startDate, endDate, prevStartDate, prevEndDate } = this.resolvePeriod(
      interval === 'monthly' ? 'lastMonth' : 'last30',
      cStart,
      cEnd
    );

    const studentFilter = { status: 'active' };
    if (className) studentFilter.className = className;
    if (department) studentFilter.department = department;

    const [activeStudents, calendar] = await Promise.all([
      Student.find(studentFilter, 'studentId').lean(),
      calendarService.getCalendar(),
    ]);

    const activeIds = activeStudents.map((s) => s.studentId);
    const totalActive = activeStudents.length;

    const records = await Attendance.aggregate([
      {
        $match: {
          attendanceDate: { $gte: startDate, $lte: endDate },
          studentId: { $in: activeIds },
        },
      },
      {
        $group: {
          _id: {
            date: '$attendanceDate',
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // Build day map
    const dayMap = {};
    records.forEach((r) => {
      const d = r._id.date;
      const s = r._id.status;
      if (!dayMap[d]) dayMap[d] = { present: 0, late: 0, onTime: 0 };
      if (s === 'present' || s === 'late' || s === 'half_day') {
        dayMap[d].present += r.count;
      }
      if (s === 'late') dayMap[d].late += r.count;
      if (s === 'present') dayMap[d].onTime += r.count;
    });

    const startDt = DateTime.fromISO(startDate);
    const endDt = DateTime.fromISO(endDate);
    const dailyTrends = [];
    let cur = startDt;

    while (cur <= endDt) {
      const dStr = cur.toFormat('yyyy-MM-dd');
      const dayData = dayMap[dStr] || { present: 0, late: 0, onTime: 0 };
      const present = dayData.present;
      const late = dayData.late;
      const onTime = dayData.onTime;
      const absent = Math.max(0, totalActive - present);
      const percentage = totalActive > 0 ? Math.round((present / totalActive) * 100) : 0;

      dailyTrends.push({
        date: dStr,
        day: cur.toFormat('ccc'),
        week: `W${cur.weekNumber}`,
        month: cur.toFormat('yyyy-MM'),
        present,
        onTime,
        late,
        absent,
        totalActive,
        percentage,
      });

      cur = cur.plus({ days: 1 });
    }

    if (interval === 'weekly') {
      // Group by week
      const weeklyMap = {};
      dailyTrends.forEach((d) => {
        const key = d.week;
        if (!weeklyMap[key]) {
          weeklyMap[key] = {
            week: key,
            present: 0,
            late: 0,
            onTime: 0,
            absent: 0,
            days: 0,
            pctSum: 0,
          };
        }
        weeklyMap[key].present += d.present;
        weeklyMap[key].late += d.late;
        weeklyMap[key].onTime += d.onTime;
        weeklyMap[key].absent += d.absent;
        weeklyMap[key].pctSum += d.percentage;
        weeklyMap[key].days++;
      });

      const weeklyTrends = Object.values(weeklyMap).map((w) => ({
        week: w.week,
        present: Math.round(w.present / w.days),
        late: Math.round(w.late / w.days),
        onTime: Math.round(w.onTime / w.days),
        absent: Math.round(w.absent / w.days),
        percentage: Math.round(w.pctSum / w.days),
      }));

      return { trends: weeklyTrends, interval: 'weekly' };
    }

    if (interval === 'monthly') {
      // Group by month
      const monthlyMap = {};
      dailyTrends.forEach((d) => {
        const key = d.month;
        if (!monthlyMap[key]) {
          monthlyMap[key] = {
            month: key,
            present: 0,
            late: 0,
            onTime: 0,
            absent: 0,
            days: 0,
            pctSum: 0,
          };
        }
        monthlyMap[key].present += d.present;
        monthlyMap[key].late += d.late;
        monthlyMap[key].onTime += d.onTime;
        monthlyMap[key].absent += d.absent;
        monthlyMap[key].pctSum += d.percentage;
        monthlyMap[key].days++;
      });

      const monthlyTrends = Object.values(monthlyMap).map((m) => ({
        month: m.month,
        present: Math.round(m.present / m.days),
        late: Math.round(m.late / m.days),
        onTime: Math.round(m.onTime / m.days),
        absent: Math.round(m.absent / m.days),
        percentage: Math.round(m.pctSum / m.days),
      }));

      return { trends: monthlyTrends, interval: 'monthly' };
    }

    return { trends: dailyTrends, interval: 'daily' };
  }

  /**
   * 360-degree Student Attendance Profile & Analytics.
   */
  async getStudentAnalytics(studentId) {
    const student = await Student.findOne({ studentId: studentId.toUpperCase() }).lean();
    if (!student) {
      const err = new Error(`Student ${studentId} not found`);
      err.statusCode = 404;
      throw err;
    }

    const cards = await RfidCard.find({ studentId: student.studentId }).lean();
    const calendar = await calendarService.getCalendar();
    const now = nowInTimezone();
    const todayStr = now.toFormat('yyyy-MM-dd');

    // Fetch all attendance for student
    const attendanceRecords = await Attendance.find({ studentId: student.studentId })
      .sort({ attendanceDate: 1 })
      .lean();

    const attendanceByDate = Object.fromEntries(attendanceRecords.map((r) => [r.attendanceDate, r]));

    // Resolve date windows
    const last7DaysStr = now.minus({ days: 6 }).toFormat('yyyy-MM-dd');
    const last30DaysStr = now.minus({ days: 29 }).toFormat('yyyy-MM-dd');
    const thisMonthStart = now.startOf('month').toFormat('yyyy-MM-dd');

    // Get active semester or default 6-month window
    const activeSemester = (calendar.semesters || []).find((s) => s.isActive) || {
      name: 'Current Academic Term',
      startDate: now.minus({ months: 5 }).startOf('month').toFormat('yyyy-MM-dd'),
      endDate: todayStr,
    };

    let windowStart = activeSemester.startDate;
    if (attendanceRecords.length > 0 && attendanceRecords[0].attendanceDate < windowStart) {
      windowStart = attendanceRecords[0].attendanceDate;
    }

    // Calculate working days applicable to student
    const allWorkingDays = await calendarService.getWorkingDaysList(
      windowStart,
      todayStr,
      calendar
    );
    const applicableWorkingDays = calendarService.filterDaysForStudent(allWorkingDays, student);

    // Calculate streaks & total statistics
    let longestPresentStreak = 0;
    let longestAbsentStreak = 0;
    let currentPresentStreak = 0;
    let currentAbsentStreak = 0;

    let totalPresent = 0;
    let totalLate = 0;
    let totalOnTime = 0;
    let totalAbsent = 0;

    // Heatmap data array
    const calendarHeatmap = [];

    // Arrival times for distribution
    const arrivalMinutesPast9 = [];

    applicableWorkingDays.forEach((dateStr) => {
      const record = attendanceByDate[dateStr];
      const isPresent = record && (record.status === 'present' || record.status === 'late' || record.status === 'half_day');

      if (isPresent) {
        totalPresent++;
        if (record.status === 'late') totalLate++;
        if (record.status === 'present') totalOnTime++;

        currentPresentStreak++;
        longestPresentStreak = Math.max(longestPresentStreak, currentPresentStreak);
        currentAbsentStreak = 0;

        if (record.checkInTime) {
          const dt = DateTime.fromJSDate(record.checkInTime).setZone(config.timezone);
          const totalMinutes = dt.hour * 60 + dt.minute;
          arrivalMinutesPast9.push(totalMinutes);
        }

        calendarHeatmap.push({
          date: dateStr,
          status: record.status,
          checkIn: record.checkInTime ? formatTimeDisplay(record.checkInTime) : null,
          checkOut: record.checkOutTime ? formatTimeDisplay(record.checkOutTime) : null,
        });
      } else {
        totalAbsent++;
        currentAbsentStreak++;
        longestAbsentStreak = Math.max(longestAbsentStreak, currentAbsentStreak);
        currentPresentStreak = 0;

        calendarHeatmap.push({
          date: dateStr,
          status: 'absent',
          checkIn: null,
          checkOut: null,
        });
      }
    });

    const totalWorkingDays = applicableWorkingDays.length;
    const overallRate = totalWorkingDays > 0 ? Math.round((totalPresent / totalWorkingDays) * 100) : 0;

    // Window rates helper
    const calculateWindowRate = (startBoundary) => {
      const windowDays = applicableWorkingDays.filter((d) => d >= startBoundary && d <= todayStr);
      if (windowDays.length === 0) return 100;
      let presentCount = 0;
      windowDays.forEach((d) => {
        if (attendanceByDate[d] && attendanceByDate[d].status !== 'absent') presentCount++;
      });
      return Math.round((presentCount / windowDays.length) * 100);
    };

    const rateLast7Days = calculateWindowRate(last7DaysStr);
    const rateLast30Days = calculateWindowRate(last30DaysStr);
    const rateThisMonth = calculateWindowRate(thisMonthStart);

    // Monthly breakdown
    const monthlyMap = {};
    applicableWorkingDays.forEach((d) => {
      const m = d.substring(0, 7);
      if (!monthlyMap[m]) monthlyMap[m] = { month: m, workingDays: 0, present: 0, late: 0, absent: 0 };
      monthlyMap[m].workingDays++;
      const rec = attendanceByDate[d];
      if (rec && rec.status !== 'absent') {
        monthlyMap[m].present++;
        if (rec.status === 'late') monthlyMap[m].late++;
      } else {
        monthlyMap[m].absent++;
      }
    });

    const monthlyBreakdown = Object.values(monthlyMap).map((m) => ({
      ...m,
      rate: m.workingDays > 0 ? Math.round((m.present / m.workingDays) * 100) : 0,
    }));

    // Average arrival time
    let averageArrivalTimeStr = '09:00 AM';
    if (arrivalMinutesPast9.length > 0) {
      const avgMinutes = Math.round(
        arrivalMinutesPast9.reduce((a, b) => a + b, 0) / arrivalMinutesPast9.length
      );
      const hour = Math.floor(avgMinutes / 60);
      const minute = avgMinutes % 60;
      averageArrivalTimeStr = DateTime.now()
        .setZone(config.timezone)
        .set({ hour, minute })
        .toFormat('hh:mm a');
    }

    // Arrival time distribution buckets
    // Scheduled start is 09:00 = 540 min. Late threshold 09:30 = 570 min.
    const arrivalDistribution = {
      early: 0,       // < 09:00 (< 540)
      onTime: 0,      // 09:00 - 09:30 (540 - 570)
      late1to15: 0,   // 09:31 - 09:45 (571 - 585)
      late16to30: 0,  // 09:46 - 10:00 (586 - 600)
      late30Plus: 0,  // > 10:00 (> 600)
    };

    arrivalMinutesPast9.forEach((mins) => {
      if (mins < 540) arrivalDistribution.early++;
      else if (mins <= 570) arrivalDistribution.onTime++;
      else if (mins <= 585) arrivalDistribution.late1to15++;
      else if (mins <= 600) arrivalDistribution.late16to30++;
      else arrivalDistribution.late30Plus++;
    });

    // Behavioural Indicators
    const isBelowThreshold = overallRate < (calendar.riskThresholdPercentage || 75);
    const hasConsecutiveAbsences = currentAbsentStreak >= (calendar.consecutiveAbsenceThreshold || 3);
    const isFrequentlyLate = totalLate >= 3;
    const isDeclining = rateLast30Days < overallRate - 8;
    const isImproving = rateLast30Days > overallRate + 5;

    return {
      student: {
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        className: student.className,
        department: student.department || 'General',
        email: student.email,
        phone: student.phone,
        status: student.status,
        cards,
      },
      metrics: {
        totalWorkingDays,
        totalPresentDays: totalPresent,
        totalAbsentDays: totalAbsent,
        totalLateArrivals: totalLate,
        totalOnTimeArrivals: totalOnTime,
        overallAttendanceRate: overallRate,
        rateLast7Days,
        rateLast30Days,
        rateThisMonth,
        longestPresentStreak,
        longestAbsentStreak,
        currentAbsentStreak,
        averageArrivalTime: averageArrivalTimeStr,
        threshold: calendar.riskThresholdPercentage || 75,
      },
      indicators: {
        isBelowThreshold,
        hasConsecutiveAbsences,
        isFrequentlyLate,
        isDeclining,
        isImproving,
        riskClassification: isBelowThreshold || hasConsecutiveAbsences ? 'at_risk' : 'normal',
      },
      visualizations: {
        monthlyBreakdown,
        arrivalDistribution,
        distribution: [
          { name: 'On-Time', value: totalOnTime, color: '#10B981' },
          { name: 'Late', value: totalLate, color: '#F59E0B' },
          { name: 'Absent', value: totalAbsent, color: '#EF4444' },
        ],
        calendarHeatmap,
      },
    };
  }

  /**
   * Class & Department Analytics using server-side aggregation.
   */
  async getClassesAnalytics({ startDate: cStart, endDate: cEnd, classNames = [] }) {
    const { startDate, endDate } = this.resolvePeriod('last30', cStart, cEnd);
    const calendar = await calendarService.getCalendar();
    const workingDays = await calendarService.getWorkingDaysList(startDate, endDate, calendar);
    const totalWorkingDays = Math.max(1, workingDays.length);

    const matchQuery = { status: 'active' };
    if (classNames && classNames.length > 0) {
      matchQuery.className = { $in: classNames };
    }

    const students = await Student.find(matchQuery, 'studentId className department').lean();
    const studentClassMap = Object.fromEntries(students.map((s) => [s.studentId, s.className]));

    // Aggregate attendance in date range
    const attendanceRecords = await Attendance.aggregate([
      {
        $match: {
          attendanceDate: { $gte: startDate, $lte: endDate },
          studentId: { $in: students.map((s) => s.studentId) },
        },
      },
      {
        $group: {
          _id: {
            studentId: '$studentId',
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const studentStats = {};
    attendanceRecords.forEach((r) => {
      const sId = r._id.studentId;
      const st = r._id.status;
      if (!studentStats[sId]) studentStats[sId] = { present: 0, late: 0 };
      if (st === 'present' || st === 'late' || st === 'half_day') studentStats[sId].present += r.count;
      if (st === 'late') studentStats[sId].late += r.count;
    });

    const classMap = {};
    students.forEach((s) => {
      const c = s.className || 'General';
      if (!classMap[c]) {
        classMap[c] = {
          className: c,
          totalStudents: 0,
          totalPresent: 0,
          totalLate: 0,
          department: s.department || 'General',
        };
      }
      classMap[c].totalStudents++;
      const stats = studentStats[s.studentId] || { present: 0, late: 0 };
      classMap[c].totalPresent += stats.present;
      classMap[c].totalLate += stats.late;
    });

    const classesList = Object.values(classMap).map((c) => {
      const expectedSessions = c.totalStudents * totalWorkingDays;
      const rate = expectedSessions > 0 ? Math.min(100, Math.round((c.totalPresent / expectedSessions) * 100)) : 0;
      const totalAbsent = Math.max(0, expectedSessions - c.totalPresent);
      return {
        ...c,
        expectedSessions,
        totalAbsent,
        attendanceRate: rate,
      };
    });

    classesList.sort((a, b) => b.attendanceRate - a.attendanceRate);

    const highestClass = classesList.length > 0 ? classesList[0] : null;
    const lowestClass = classesList.length > 0 ? classesList[classesList.length - 1] : null;

    // Department grouping
    const deptMap = {};
    classesList.forEach((c) => {
      const dept = c.department || 'General';
      if (!deptMap[dept]) {
        deptMap[dept] = {
          department: dept,
          totalStudents: 0,
          totalPresent: 0,
          expectedSessions: 0,
        };
      }
      deptMap[dept].totalStudents += c.totalStudents;
      deptMap[dept].totalPresent += c.totalPresent;
      deptMap[dept].expectedSessions += c.expectedSessions;
    });

    const departmentsList = Object.values(deptMap).map((d) => ({
      ...d,
      attendanceRate: d.expectedSessions > 0 ? Math.round((d.totalPresent / d.expectedSessions) * 100) : 0,
    }));

    return {
      period: { startDate, endDate, workingDays: totalWorkingDays },
      classes: classesList,
      departments: departmentsList,
      summary: {
        totalClasses: classesList.length,
        highestAttendanceClass: highestClass ? { name: highestClass.className, rate: highestClass.attendanceRate } : null,
        lowestAttendanceClass: lowestClass ? { name: lowestClass.className, rate: lowestClass.attendanceRate } : null,
      },
    };
  }

  /**
   * Day-of-Week and Heatmap Matrix Analysis.
   */
  async getHeatmapMatrix({ startDate: cStart, endDate: cEnd, className, studentId }) {
    const { startDate, endDate } = this.resolvePeriod('last30', cStart, cEnd);
    const filter = { attendanceDate: { $gte: startDate, $lte: endDate } };

    if (studentId) filter.studentId = studentId.toUpperCase();
    if (className) {
      const students = await Student.find({ className }, 'studentId').lean();
      filter.studentId = { $in: students.map((s) => s.studentId) };
    }

    const records = await Attendance.find(filter, 'attendanceDate status checkInTime studentId').lean();

    // Group by weekday (1=Mon ... 7=Sun)
    const weekdayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekdayMatrix = {};
    for (let i = 1; i <= 7; i++) {
      weekdayMatrix[i] = {
        weekday: i,
        dayName: weekdayNames[i],
        totalScans: 0,
        presentCount: 0,
        lateCount: 0,
        absentCount: 0,
      };
    }

    records.forEach((r) => {
      const dt = DateTime.fromISO(r.attendanceDate);
      const wd = dt.weekday;
      if (weekdayMatrix[wd]) {
        weekdayMatrix[wd].totalScans++;
        if (r.status === 'present' || r.status === 'late' || r.status === 'half_day') {
          weekdayMatrix[wd].presentCount++;
        }
        if (r.status === 'late') weekdayMatrix[wd].lateCount++;
        if (r.status === 'absent') weekdayMatrix[wd].absentCount++;
      }
    });

    const weekdayAnalysis = Object.values(weekdayMatrix).map((w) => ({
      ...w,
      lateRate: w.presentCount > 0 ? Math.round((w.lateCount / w.presentCount) * 100) : 0,
    }));

    // Detect patterns (e.g. Monday absenteeism or Friday drops)
    const patterns = [];
    const mon = weekdayMatrix[1];
    const fri = weekdayMatrix[5];
    if (mon.lateCount > fri.lateCount * 1.5 && mon.lateCount > 3) {
      patterns.push('Significantly higher late arrivals observed on Mondays.');
    }
    if (fri.absentCount > mon.absentCount * 1.5 && fri.absentCount > 3) {
      patterns.push('Higher rate of absenteeism observed on Fridays.');
    }

    return {
      period: { startDate, endDate },
      weekdayMatrix: weekdayAnalysis,
      identifiedPatterns: patterns,
      totalRecordsAnalyzed: records.length,
    };
  }

  /**
   * Punctuality Analytics with arrival buckets and frequent latecomers.
   */
  async getPunctualityAnalytics({ startDate: cStart, endDate: cEnd, className }) {
    const { startDate, endDate } = this.resolvePeriod('last30', cStart, cEnd);
    const filter = {
      attendanceDate: { $gte: startDate, $lte: endDate },
      status: { $in: ['present', 'late', 'half_day'] },
    };

    if (className) {
      const students = await Student.find({ className }, 'studentId').lean();
      filter.studentId = { $in: students.map((s) => s.studentId) };
    }

    const [records, settings] = await Promise.all([
      Attendance.find(filter, 'studentId attendanceDate checkInTime status').lean(),
      Setting.findOne().lean(),
    ]);

    const lateThresholdStr = settings?.lateThresholdTime || '09:30';
    const [tHour, tMin] = lateThresholdStr.split(':').map(Number);
    const thresholdMinutes = tHour * 60 + tMin;
    const startMinutes = thresholdMinutes - 30; // 30 mins before threshold

    const buckets = {
      early: 0,
      onTime: 0,
      late1to15: 0,
      late16to30: 0,
      late30Plus: 0,
    };

    const lateCountByStudent = {};
    let totalMinutesSum = 0;
    let validTimeCount = 0;

    records.forEach((r) => {
      if (!r.checkInTime) return;
      const dt = DateTime.fromJSDate(r.checkInTime).setZone(config.timezone);
      const mins = dt.hour * 60 + dt.minute;

      totalMinutesSum += mins;
      validTimeCount++;

      if (mins < startMinutes) buckets.early++;
      else if (mins <= thresholdMinutes) buckets.onTime++;
      else if (mins <= thresholdMinutes + 15) {
        buckets.late1to15++;
        lateCountByStudent[r.studentId] = (lateCountByStudent[r.studentId] || 0) + 1;
      } else if (mins <= thresholdMinutes + 30) {
        buckets.late16to30++;
        lateCountByStudent[r.studentId] = (lateCountByStudent[r.studentId] || 0) + 1;
      } else {
        buckets.late30Plus++;
        lateCountByStudent[r.studentId] = (lateCountByStudent[r.studentId] || 0) + 1;
      }
    });

    let avgArrivalStr = '09:00 AM';
    if (validTimeCount > 0) {
      const avgM = Math.round(totalMinutesSum / validTimeCount);
      const h = Math.floor(avgM / 60);
      const m = avgM % 60;
      avgArrivalStr = DateTime.now().setZone(config.timezone).set({ hour: h, minute: m }).toFormat('hh:mm a');
    }

    // Frequent late arrivals lookup
    const topLateStudentIds = Object.entries(lateCountByStudent)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const lateStudentsInfo = await Student.find(
      { studentId: { $in: topLateStudentIds.map((x) => x[0]) } },
      'studentId name className'
    ).lean();
    const sMap = Object.fromEntries(lateStudentsInfo.map((s) => [s.studentId, s]));

    const frequentLatecomers = topLateStudentIds.map(([sId, count]) => ({
      studentId: sId,
      name: sMap[sId]?.name || 'Unknown',
      className: sMap[sId]?.className || '-',
      lateCount: count,
    }));

    const totalLate = buckets.late1to15 + buckets.late16to30 + buckets.late30Plus;
    const totalScans = validTimeCount;
    const latePercentage = totalScans > 0 ? Math.round((totalLate / totalScans) * 100) : 0;

    return {
      period: { startDate, endDate },
      averageArrivalTime: avgArrivalStr,
      lateThreshold: lateThresholdStr,
      totalScans,
      totalLate,
      latePercentage,
      buckets: [
        { label: 'Early Arrival', count: buckets.early, color: '#3B82F6' },
        { label: 'On Time', count: buckets.onTime, color: '#10B981' },
        { label: '1–15 mins Late', count: buckets.late1to15, color: '#F59E0B' },
        { label: '16–30 mins Late', count: buckets.late16to30, color: '#F97316' },
        { label: '> 30 mins Late', count: buckets.late30Plus, color: '#EF4444' },
      ],
      frequentLatecomers,
    };
  }

  /**
   * Data Quality Anomaly Detection.
   * Identifies inconsistencies without mutating historical records.
   */
  async getDataQualityAnomalies() {
    const todayStr = nowInTimezone().toFormat('yyyy-MM-dd');
    const [missingCheckout, inactiveStudentScans, blockedCardScans] = await Promise.all([
      // 1. Missing Check-Outs for dates strictly before today
      Attendance.find({
        attendanceDate: { $lt: todayStr },
        checkOutTime: null,
      })
        .limit(50)
        .sort({ attendanceDate: -1 })
        .lean(),

      // 2. Attendance on inactive students
      Student.find({ status: 'inactive' }, 'studentId name').lean(),

      // 3. Blocked cards
      RfidCard.find({ status: 'blocked' }, 'cardUid studentId').lean(),
    ]);

    const inactiveIds = inactiveStudentScans.map((s) => s.studentId);
    const blockedUids = blockedCardScans.map((c) => c.cardUid);

    const [inactiveAttendance, blockedAttendance] = await Promise.all([
      inactiveIds.length > 0
        ? Attendance.find({ studentId: { $in: inactiveIds } }).limit(25).lean()
        : [],
      blockedUids.length > 0
        ? Attendance.find({ cardUid: { $in: blockedUids } }).limit(25).lean()
        : [],
    ]);

    // Format results
    const anomalies = [];

    missingCheckout.forEach((r) => {
      anomalies.push({
        id: r._id,
        category: 'Missing Check-out',
        severity: 'medium',
        date: r.attendanceDate,
        studentId: r.studentId,
        cardUid: r.cardUid,
        description: `Student checked in at ${formatTimeDisplay(r.checkInTime)} but check-out was never recorded.`,
      });
    });

    inactiveAttendance.forEach((r) => {
      anomalies.push({
        id: r._id,
        category: 'Inactive Student Record',
        severity: 'high',
        date: r.attendanceDate,
        studentId: r.studentId,
        cardUid: r.cardUid,
        description: `Attendance record exists for student marked as inactive in student registry.`,
      });
    });

    blockedAttendance.forEach((r) => {
      anomalies.push({
        id: r._id,
        category: 'Blocked Card Activity',
        severity: 'high',
        date: r.attendanceDate,
        studentId: r.studentId,
        cardUid: r.cardUid,
        description: `Historical scan found matching RFID card UID currently marked as blocked.`,
      });
    });

    return {
      totalAnomalies: anomalies.length,
      categories: {
        missingCheckoutCount: missingCheckout.length,
        inactiveStudentRecordCount: inactiveAttendance.length,
        blockedCardActivityCount: blockedAttendance.length,
      },
      anomalies,
    };
  }
}

module.exports = new AnalyticsService();
