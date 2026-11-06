const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { DateTime } = require('luxon');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Device = require('../models/Device');
const AuditLog = require('../models/AuditLog');
const Setting = require('../models/Setting');
const GeneratedReport = require('../models/GeneratedReport');
const attendanceService = require('./attendanceService');
const calendarService = require('./calendarService');
const config = require('../config');
const { nowInTimezone, formatTimeDisplay } = require('../utils/timezone');

const REPORTS_DIR = path.join(__dirname, '../../reports_export');
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

class ReportBuilderService {
  /**
   * Compiles report dataset according to requested type and filters.
   */
  async compileReportData({
    reportType = 'daily',
    startDate: cStart,
    endDate: cEnd,
    studentId,
    className,
    department,
    status,
    threshold = 75,
    deviceId,
  }) {
    const now = nowInTimezone();
    let startDate = cStart;
    let endDate = cEnd;

    // Resolve date defaults
    if (!startDate || !endDate) {
      if (reportType === 'daily') {
        startDate = now.toFormat('yyyy-MM-dd');
        endDate = startDate;
      } else if (reportType === 'weekly') {
        startDate = now.minus({ days: 6 }).toFormat('yyyy-MM-dd');
        endDate = now.toFormat('yyyy-MM-dd');
      } else if (reportType === 'monthly') {
        startDate = now.startOf('month').toFormat('yyyy-MM-dd');
        endDate = now.toFormat('yyyy-MM-dd');
      } else {
        startDate = now.minus({ days: 29 }).toFormat('yyyy-MM-dd');
        endDate = now.toFormat('yyyy-MM-dd');
      }
    }

    // Special Handling: Audit Correction Report
    if (reportType === 'audit_correction') {
      const logs = await AuditLog.find({
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(`${endDate}T23:59:59.999Z`),
        },
      })
        .sort({ timestamp: -1 })
        .limit(2000)
        .lean();

      return {
        title: 'Attendance Correction & Administrative Audit Report',
        reportType,
        period: { startDate, endDate },
        totalRecords: logs.length,
        records: logs.map((l) => ({
          date: DateTime.fromJSDate(l.timestamp).setZone(config.timezone).toFormat('yyyy-MM-dd hh:mm a'),
          administrator: l.administrator,
          operation: l.operation,
          recordType: l.recordType,
          recordId: l.recordId || '-',
          reason: l.reason,
        })),
        columns: ['Date & Time', 'Administrator', 'Operation', 'Entity', 'Record ID', 'Reason'],
      };
    }

    // Student filter building
    const sQuery = {};
    if (className) sQuery.className = className;
    if (department) sQuery.department = department;
    if (studentId) sQuery.studentId = studentId.toUpperCase();

    const [students, devices, settings, calendar] = await Promise.all([
      Student.find(sQuery).lean(),
      Device.find().lean(),
      Setting.findOne().lean(),
      calendarService.getCalendar(),
    ]);

    const studentMap = Object.fromEntries(students.map((s) => [s.studentId, s]));
    const deviceMap = Object.fromEntries(devices.map((d) => [d.deviceId, d.deviceName || d.deviceId]));
    const studentIds = students.map((s) => s.studentId);

    // Build Attendance query
    const attFilter = {
      attendanceDate: { $gte: startDate, $lte: endDate },
      studentId: { $in: studentIds },
    };

    if (status && status !== 'all') {
      attFilter.status = status;
    }
    if (deviceId) {
      attFilter.deviceId = deviceId;
    }

    // Specific filters based on report type
    if (reportType === 'late_arrival') {
      attFilter.status = 'late';
    }

    const rawRecords = await Attendance.find(attFilter)
      .sort({ attendanceDate: -1, checkInTime: -1 })
      .limit(5000)
      .lean();

    const workingDays = await calendarService.getWorkingDaysList(startDate, endDate, calendar);
    const totalWorkingDays = Math.max(1, workingDays.length);

    // Normalizing records
    let records = rawRecords.map((r) => {
      const st = studentMap[r.studentId] || {};
      return {
        attendanceDate: r.attendanceDate,
        studentId: r.studentId,
        studentName: st.name || 'Unknown',
        className: st.className || '-',
        department: st.department || 'General',
        checkInTime: r.checkInTime ? formatTimeDisplay(r.checkInTime) : '--',
        checkOutTime: r.checkOutTime ? formatTimeDisplay(r.checkOutTime) : '--',
        status: (r.status || 'present').toUpperCase(),
        cardUid: r.cardUid,
        device: deviceMap[r.deviceId] || r.deviceId,
      };
    });

    // Special Type: Below Threshold Report
    if (reportType === 'below_threshold') {
      const studentPresentCounts = {};
      rawRecords.forEach((r) => {
        if (r.status !== 'absent') {
          studentPresentCounts[r.studentId] = (studentPresentCounts[r.studentId] || 0) + 1;
        }
      });

      const lowAttendanceStudents = [];
      students.forEach((s) => {
        const p = studentPresentCounts[s.studentId] || 0;
        const rate = Math.round((p / totalWorkingDays) * 100);
        if (rate < threshold) {
          lowAttendanceStudents.push({
            studentId: s.studentId,
            studentName: s.name,
            className: s.className,
            department: s.department || 'General',
            presentDays: p,
            totalWorkingDays,
            attendanceRate: `${rate}%`,
            threshold: `${threshold}%`,
          });
        }
      });

      return {
        title: `Students Below ${threshold}% Attendance Threshold Report`,
        reportType,
        period: { startDate, endDate, workingDays: totalWorkingDays },
        totalRecords: lowAttendanceStudents.length,
        records: lowAttendanceStudents,
        columns: ['Student ID', 'Student Name', 'Class', 'Department', 'Present Days', 'Working Days', 'Attendance Rate', 'Required Threshold'],
      };
    }

    const presentCount = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
    const lateCount = records.filter((r) => r.status === 'LATE').length;
    const maxPossible = Math.max(1, students.length * totalWorkingDays);
    const attendanceRate = Math.min(100, Math.round((presentCount / maxPossible) * 100));

    return {
      title: `${reportType.replace(/_/g, ' ').toUpperCase()} Attendance Report`,
      reportType,
      period: { startDate, endDate, workingDays: totalWorkingDays },
      summary: {
        totalStudents: students.length,
        totalSessions: records.length,
        presentCount,
        lateCount,
        attendanceRate: `${attendanceRate}%`,
        institutionName: settings?.institutionName || 'Smart RFID Institute',
      },
      totalRecords: records.length,
      records,
      columns: ['Attendance Date', 'Student ID', 'Student Name', 'Class', 'Department', 'Check-In', 'Check-Out', 'Status', 'Card UID', 'Device'],
    };
  }

  /**
   * Generates native Excel (.xlsx) workbook using ExcelJS.
   */
  async exportToExcel(reportData) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Smart RFID Attendance System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Attendance Report');

    // Title styling
    sheet.mergeCells('A1:J1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = reportData.title || 'Attendance Report';
    titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF312E81' }, // Deep Indigo
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 35;

    // Subtitle / Period
    sheet.mergeCells('A2:J2');
    const subCell = sheet.getCell('A2');
    subCell.value = `Period: ${reportData.period.startDate} to ${reportData.period.endDate} | Generated: ${new Date().toLocaleString()}`;
    subCell.font = { name: 'Calibri', size: 10, italic: true };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 20;

    // Headers
    const headers = reportData.columns;
    const headerRow = sheet.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' }, // Indigo-600
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Populate Data Rows
    reportData.records.forEach((rowObj) => {
      const rowValues = Object.values(rowObj);
      const row = sheet.addRow(rowValues);
      row.eachCell((cell, colNumber) => {
        cell.alignment = { vertical: 'middle' };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        // Status highlighting
        if (cell.value === 'PRESENT') {
          cell.font = { bold: true, color: { argb: 'FF15803D' } }; // Emerald
        } else if (cell.value === 'LATE') {
          cell.font = { bold: true, color: { argb: 'FFB45309' } }; // Amber
        } else if (cell.value === 'ABSENT') {
          cell.font = { bold: true, color: { argb: 'FFB91C1C' } }; // Rose
        }
      });
    });

    // Auto-fit column widths
    sheet.columns.forEach((col) => {
      col.width = 18;
    });

    const fileName = `Report_${reportData.reportType}_${Date.now()}.xlsx`;
    const filePath = path.join(REPORTS_DIR, fileName);
    await workbook.xlsx.writeFile(filePath);

    const stats = fs.statSync(filePath);
    return { fileName, filePath, fileSize: stats.size };
  }

  /**
   * Generates CSV format.
   */
  async exportToCsv(reportData) {
    const headers = reportData.columns.map((h) => `"${h}"`).join(',');
    const rows = reportData.records.map((r) =>
      Object.values(r)
        .map((val) => {
          if (val === null || val === undefined) return '""';
          let str = String(val).trim();
          if (/^[=+\-@\t\r]/.test(str)) str = "'" + str; // formula injection protection
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    const csvContent = [headers, ...rows].join('\n');
    const fileName = `Report_${reportData.reportType}_${Date.now()}.csv`;
    const filePath = path.join(REPORTS_DIR, fileName);
    fs.writeFileSync(filePath, csvContent, 'utf8');

    const stats = fs.statSync(filePath);
    return { fileName, filePath, fileSize: stats.size };
  }

  /**
   * Background Recurring Schedule Runner.
   */
  async runDueSchedules() {
    const ReportSchedule = require('../models/ReportSchedule');
    const now = nowInTimezone();
    const curTime = now.toFormat('HH:mm');
    const curDayOfWeek = now.weekday; // 1=Mon ... 7=Sun
    const curDayOfMonth = now.day;

    const activeSchedules = await ReportSchedule.find({ isActive: true }).lean();

    for (const schedule of activeSchedules) {
      try {
        // Check if frequency matches today
        let shouldRun = false;
        if (schedule.frequency === 'daily') shouldRun = true;
        else if (schedule.frequency === 'weekly' && schedule.dayOfWeek === curDayOfWeek) shouldRun = true;
        else if (schedule.frequency === 'monthly' && schedule.dayOfMonth === curDayOfMonth) shouldRun = true;

        if (!shouldRun) continue;

        // Verify it hasn't run within the last 6 hours
        if (schedule.lastRunAt) {
          const hoursSinceLast = now.diff(DateTime.fromJSDate(schedule.lastRunAt), 'hours').hours;
          if (hoursSinceLast < 6) continue;
        }

        // Execute report compilation
        const reportData = await this.compileReportData({
          reportType: schedule.reportType,
          ...schedule.filters,
        });

        let exportResult;
        if (schedule.format === 'xlsx') {
          exportResult = await this.exportToExcel(reportData);
        } else {
          exportResult = await this.exportToCsv(reportData);
        }

        // Save GeneratedReport record
        await GeneratedReport.create({
          title: schedule.title,
          reportType: schedule.reportType,
          scheduleId: schedule._id,
          format: schedule.format,
          period: reportData.period,
          filters: schedule.filters,
          recordCount: reportData.totalRecords,
          fileSize: exportResult.fileSize,
          filePath: exportResult.filePath,
          fileName: exportResult.fileName,
          generatedBy: 'Automated Scheduler',
        });

        // Update schedule document
        await ReportSchedule.findByIdAndUpdate(schedule._id, {
          lastRunAt: new Date(),
          lastError: null,
        });

        console.log(`[Scheduler]: Successfully generated scheduled report '${schedule.title}'`);
      } catch (err) {
        console.error(`[Scheduler Error]: Failed schedule '${schedule.title}':`, err.message);
        await ReportSchedule.findByIdAndUpdate(schedule._id, {
          lastError: err.message,
        });
      }
    }
  }
}

module.exports = new ReportBuilderService();
