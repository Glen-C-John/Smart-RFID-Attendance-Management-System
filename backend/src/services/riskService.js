const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const AttendanceAlert = require('../models/AttendanceAlert');
const calendarService = require('./calendarService');
const auditService = require('./auditService');
const { nowInTimezone } = require('../utils/timezone');

class RiskService {
  /**
   * Evaluates all active students against the 5 deterministic rules.
   * Generates or updates AttendanceAlert records in MongoDB.
   */
  async evaluateRiskAlerts() {
    const calendar = await calendarService.getCalendar();
    const threshold = calendar.riskThresholdPercentage || 75;
    const consecThreshold = calendar.consecutiveAbsenceThreshold || 3;

    const now = nowInTimezone();
    const todayStr = now.toFormat('yyyy-MM-dd');
    const last30DaysStart = now.minus({ days: 29 }).toFormat('yyyy-MM-dd');
    const prev30DaysStart = now.minus({ days: 59 }).toFormat('yyyy-MM-dd');
    const prev30DaysEnd = now.minus({ days: 30 }).toFormat('yyyy-MM-dd');

    const [activeStudents, workingDays30, workingDaysPrev30] = await Promise.all([
      Student.find({ status: 'active' }, 'studentId name className department createdAt').lean(),
      calendarService.getWorkingDaysList(last30DaysStart, todayStr, calendar),
      calendarService.getWorkingDaysList(prev30DaysStart, prev30DaysEnd, calendar),
    ]);

    const activeIds = activeStudents.map((s) => s.studentId);

    // Fetch attendance for the last 60 days
    const attendanceRecords = await Attendance.find({
      attendanceDate: { $gte: prev30DaysStart, $lte: todayStr },
      studentId: { $in: activeIds },
    })
      .sort({ attendanceDate: 1 })
      .lean();

    // Group by student
    const attendanceByStudent = {};
    attendanceRecords.forEach((r) => {
      if (!attendanceByStudent[r.studentId]) attendanceByStudent[r.studentId] = [];
      attendanceByStudent[r.studentId].push(r);
    });

    const evaluatedAlerts = [];

    for (const student of activeStudents) {
      const studentHistory = attendanceByStudent[student.studentId] || [];
      const historyMap = Object.fromEntries(studentHistory.map((r) => [r.attendanceDate, r]));

      // 1. Working days applicable to this student in last 30 days
      const applicableDays30 = calendarService.filterDaysForStudent(workingDays30, student);
      const applicableDaysPrev30 = calendarService.filterDaysForStudent(workingDaysPrev30, student);

      let present30 = 0;
      let late30 = 0;
      let consecutiveAbsences = 0;
      let curAbsenceRun = 0;

      // Iterate chronological days for last 30 days
      applicableDays30.forEach((d) => {
        const rec = historyMap[d];
        const isPresent = rec && (rec.status === 'present' || rec.status === 'late' || rec.status === 'half_day');
        if (isPresent) {
          present30++;
          if (rec.status === 'late') late30++;
          curAbsenceRun = 0;
        } else {
          curAbsenceRun++;
          consecutiveAbsences = Math.max(consecutiveAbsences, curAbsenceRun);
        }
      });

      // Compute last 30-day rate
      const last30Rate = applicableDays30.length > 0
        ? Math.round((present30 / applicableDays30.length) * 100)
        : 100;

      // Compute previous 30-day rate
      let prev30Present = 0;
      applicableDaysPrev30.forEach((d) => {
        const rec = historyMap[d];
        if (rec && rec.status !== 'absent') prev30Present++;
      });
      const prev30Rate = applicableDaysPrev30.length > 0
        ? Math.round((prev30Present / applicableDaysPrev30.length) * 100)
        : 100;

      const rateDelta = last30Rate - prev30Rate;

      // 5 Explainable Deterministic Rules
      const flaggedReasons = [];

      // Rule 1: Overall / 30-day rate below threshold
      if (last30Rate < threshold) {
        flaggedReasons.push(`Attendance is ${last30Rate}%, below the required threshold of ${threshold}%.`);
      }

      // Rule 2: 3 or more consecutive absences
      if (curAbsenceRun >= consecThreshold || consecutiveAbsences >= consecThreshold) {
        flaggedReasons.push(`Recorded ${Math.max(curAbsenceRun, consecutiveAbsences)} consecutive unexcused absences.`);
      }

      // Rule 3: Repeated late arrivals (3 or more in 30 days)
      if (late30 >= 3) {
        flaggedReasons.push(`Frequent punctuality violations: arrived late ${late30} times in the last 30 days.`);
      }

      // Rule 4: Attendance declining significantly (>= 10 percentage points)
      if (rateDelta <= -10) {
        flaggedReasons.push(`Attendance declined by ${Math.abs(rateDelta)} percentage points compared to the previous period.`);
      }

      // Rule 5: Severe rate below 60%
      if (last30Rate < 60) {
        flaggedReasons.push(`Critical attendance deficit: attendance dropped below 60% (${last30Rate}%).`);
      }

      // Risk Classification Matrix
      let riskClassification = 'normal';
      if (flaggedReasons.length >= 3 || last30Rate < 50 || curAbsenceRun >= 5) {
        riskClassification = 'critical';
      } else if (flaggedReasons.length >= 1 && (last30Rate < threshold || consecutiveAbsences >= consecThreshold)) {
        riskClassification = 'at_risk';
      } else if (flaggedReasons.length > 0) {
        riskClassification = 'needs_attention';
      }

      const alertPayload = {
        studentId: student.studentId,
        studentName: student.name,
        className: student.className,
        riskClassification,
        reasons: flaggedReasons,
        metrics: {
          overallAttendanceRate: last30Rate,
          last30DaysRate: last30Rate,
          consecutiveAbsences: Math.max(curAbsenceRun, consecutiveAbsences),
          repeatedLates30Days: late30,
          rateDeltaPreviousPeriod: rateDelta,
        },
      };

      evaluatedAlerts.push(alertPayload);
    }

    return evaluatedAlerts;
  }

  /**
   * Retrieves risk alerts with filtering.
   */
  async getRiskAlerts({ classification, className, status = 'active' }) {
    const alerts = await this.evaluateRiskAlerts();
    let filtered = alerts;

    if (classification && classification !== 'all') {
      filtered = filtered.filter((a) => a.riskClassification === classification);
    } else {
      // Show flagged students by default
      filtered = filtered.filter((a) => a.riskClassification !== 'normal');
    }

    if (className) {
      filtered = filtered.filter((a) => a.className === className);
    }

    const summary = {
      totalEvaluated: alerts.length,
      normalCount: alerts.filter((a) => a.riskClassification === 'normal').length,
      needsAttentionCount: alerts.filter((a) => a.riskClassification === 'needs_attention').length,
      atRiskCount: alerts.filter((a) => a.riskClassification === 'at_risk').length,
      criticalCount: alerts.filter((a) => a.riskClassification === 'critical').length,
    };

    return { summary, alerts: filtered };
  }

  /**
   * Marks a risk alert as reviewed and records admin comments in audit trail.
   */
  async reviewAlert({ studentId, administrator = 'admin', comment }) {
    let alertDoc = await AttendanceAlert.findOne({ studentId });
    if (!alertDoc) {
      alertDoc = new AttendanceAlert({ studentId, riskClassification: 'needs_attention' });
    }

    alertDoc.status = 'reviewed';
    alertDoc.reviewedBy = administrator;
    alertDoc.reviewComment = comment || 'Reviewed by administrator';
    alertDoc.reviewedAt = new Date();
    await alertDoc.save();

    await auditService.logAction({
      administrator,
      operation: 'review_attendance_alert',
      recordType: 'AttendanceAlert',
      recordId: studentId,
      newValue: { status: 'reviewed', comment },
      reason: comment || 'Risk alert marked as reviewed',
    });

    return alertDoc;
  }
}

module.exports = new RiskService();
