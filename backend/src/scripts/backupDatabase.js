const fs = require('fs');
const path = require('path');
const { connectDB, disconnectDB } = require('../config/db');
const Student = require('../models/Student');
const RfidCard = require('../models/RfidCard');
const Attendance = require('../models/Attendance');
const Device = require('../models/Device');
const Setting = require('../models/Setting');
const InstitutionCalendar = require('../models/InstitutionCalendar');
const AttendanceAlert = require('../models/AttendanceAlert');
const ReportSchedule = require('../models/ReportSchedule');
const GeneratedReport = require('../models/GeneratedReport');
const AuditLog = require('../models/AuditLog');

const runBackup = async () => {
  try {
    await connectDB();
    console.log('[Backup] Initiating database snapshot...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../../backups');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFile = path.join(backupDir, `mongodb_backup_${timestamp}.json`);

    const [
      students,
      rfidcards,
      attendances,
      devices,
      settings,
      calendars,
      alerts,
      schedules,
      reports,
      auditlogs,
    ] = await Promise.all([
      Student.find().lean(),
      RfidCard.find().lean(),
      Attendance.find().lean(),
      Device.find().lean(),
      Setting.find().lean(),
      InstitutionCalendar.find().lean(),
      AttendanceAlert.find().lean(),
      ReportSchedule.find().lean(),
      GeneratedReport.find().lean(),
      AuditLog.find().lean(),
    ]);

    const backupData = {
      version: '3.0.0',
      timestamp: new Date().toISOString(),
      counts: {
        students: students.length,
        rfidcards: rfidcards.length,
        attendances: attendances.length,
        devices: devices.length,
        settings: settings.length,
        calendars: calendars.length,
        alerts: alerts.length,
        schedules: schedules.length,
        reports: reports.length,
        auditlogs: auditlogs.length,
      },
      data: {
        students,
        rfidcards,
        attendances,
        devices,
        settings,
        calendars,
        alerts,
        schedules,
        reports,
        auditlogs,
      },
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8');

    console.log('====================================================');
    console.log('  Database Backup Completed Successfully           ');
    console.log(`  File:        ${backupFile}`);
    console.log(`  Students:    ${students.length}`);
    console.log(`  RFID Cards:  ${rfidcards.length}`);
    console.log(`  Attendance:  ${attendances.length}`);
    console.log(`  Devices:     ${devices.length}`);
    console.log(`  Settings:    ${settings.length}`);
    console.log('====================================================');

    return { backupFile, counts: backupData.counts };
  } catch (error) {
    console.error('[Backup] Failed to create database backup:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

if (require.main === module) {
  runBackup();
}

module.exports = { runBackup };

