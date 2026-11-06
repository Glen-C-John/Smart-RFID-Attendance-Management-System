const fs = require('fs');
const path = require('path');
const { connectDB, disconnectDB } = require('../config/db');
const Student = require('../models/Student');
const RfidCard = require('../models/RfidCard');
const Attendance = require('../models/Attendance');
const Device = require('../models/Device');
const Setting = require('../models/Setting');

const runRestore = async (backupFilePath) => {
  if (!backupFilePath) {
    console.error('[Restore] Please provide backup file path. Example: node src/scripts/restoreDatabase.js backups/mongodb_backup_xxx.json');
    process.exit(1);
  }

  const resolvedPath = path.resolve(backupFilePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`[Restore] Error: Backup file not found at ${resolvedPath}`);
    process.exit(1);
  }

  try {
    await connectDB();
    console.log(`[Restore] Loading snapshot from: ${resolvedPath}`);

    const rawData = fs.readFileSync(resolvedPath, 'utf-8');
    const backupJson = JSON.parse(rawData);

    if (!backupJson.data) {
      throw new Error("Invalid backup format: missing 'data' root object");
    }

    const { students = [], rfidcards = [], attendances = [], devices = [], settings = [] } = backupJson.data;

    let restoredStudents = 0;
    for (const s of students) {
      await Student.updateOne({ studentId: s.studentId }, { $set: s }, { upsert: true });
      restoredStudents++;
    }

    let restoredCards = 0;
    for (const c of rfidcards) {
      await RfidCard.updateOne({ cardUid: c.cardUid }, { $set: c }, { upsert: true });
      restoredCards++;
    }

    let restoredAttendances = 0;
    for (const a of attendances) {
      await Attendance.updateOne(
        { studentId: a.studentId, attendanceDate: a.attendanceDate },
        { $set: a },
        { upsert: true }
      );
      restoredAttendances++;
    }

    let restoredDevices = 0;
    for (const d of devices) {
      await Device.updateOne({ deviceId: d.deviceId }, { $set: d }, { upsert: true });
      restoredDevices++;
    }

    let restoredSettings = 0;
    for (const st of settings) {
      await Setting.updateOne({}, { $set: st }, { upsert: true });
      restoredSettings++;
    }

    console.log('====================================================');
    console.log('  Database Restoration Completed Successfully       ');
    console.log(`  Source:      ${resolvedPath}`);
    console.log(`  Students:    ${restoredStudents} upserted`);
    console.log(`  RFID Cards:  ${restoredCards} upserted`);
    console.log(`  Attendance:  ${restoredAttendances} upserted`);
    console.log(`  Devices:     ${restoredDevices} upserted`);
    console.log(`  Settings:    ${restoredSettings} upserted`);
    console.log('====================================================');

    return {
      success: true,
      restoredCounts: {
        students: restoredStudents,
        rfidcards: restoredCards,
        attendances: restoredAttendances,
        devices: restoredDevices,
        settings: restoredSettings,
      },
    };
  } catch (error) {
    console.error('[Restore] Failed to restore database:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

if (require.main === module) {
  const fileArg = process.argv[2];
  runRestore(fileArg);
}

module.exports = { runRestore };
