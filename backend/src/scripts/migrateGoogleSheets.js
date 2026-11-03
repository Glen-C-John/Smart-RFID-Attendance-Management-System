const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { DateTime } = require('luxon');
const mongoose = require('mongoose');

const config = require('../config');
const { connectDB, disconnectDB } = require('../config/db');
const Student = require('../models/Student');
const RfidCard = require('../models/RfidCard');
const Attendance = require('../models/Attendance');
const { isLateArrival } = require('../utils/timezone');

/**
 * Parses and normalizes diverse date/time formats into a valid Luxon DateTime in the target timezone.
 */
function parseDateTime(dateStr, timeStr, tz = config.timezone) {
  if (!dateStr) return null;
  const cleanDate = dateStr.trim();
  const cleanTime = (timeStr || '09:00:00').trim();

  // Try ISO format (e.g. 2026-11-03)
  let dt = DateTime.fromFormat(`${cleanDate} ${cleanTime}`, 'yyyy-MM-dd HH:mm:ss', { zone: tz });
  if (dt.isValid) return dt;

  dt = DateTime.fromFormat(`${cleanDate} ${cleanTime}`, 'yyyy-MM-dd H:mm:ss', { zone: tz });
  if (dt.isValid) return dt;

  dt = DateTime.fromFormat(`${cleanDate} ${cleanTime}`, 'yyyy-MM-dd hh:mm:ss a', { zone: tz });
  if (dt.isValid) return dt;

  // Try DD/MM/YYYY
  dt = DateTime.fromFormat(`${cleanDate} ${cleanTime}`, 'dd/MM/yyyy HH:mm:ss', { zone: tz });
  if (dt.isValid) return dt;

  dt = DateTime.fromFormat(`${cleanDate} ${cleanTime}`, 'dd/MM/yyyy hh:mm:ss a', { zone: tz });
  if (dt.isValid) return dt;

  // Try MM/DD/YYYY
  dt = DateTime.fromFormat(`${cleanDate} ${cleanTime}`, 'MM/dd/yyyy HH:mm:ss', { zone: tz });
  if (dt.isValid) return dt;

  // Fallback to JS Date parser
  const jsDate = new Date(`${cleanDate} ${cleanTime}`);
  if (!isNaN(jsDate.getTime())) {
    return DateTime.fromJSDate(jsDate).setZone(tz);
  }

  return null;
}

/**
 * Migration core logic.
 * @param {Object} options
 * @param {string} options.filePath - Path to CSV file
 * @param {boolean} options.dryRun - Whether to run without writing to DB
 * @param {string} options.deviceId - Device ID to attribute historical scans
 */
async function runMigration({
  filePath = path.join(__dirname, '../../data/sample_google_sheets_export.csv'),
  dryRun = false,
  deviceId = 'ESP8266_MIGRATION',
} = {}) {
  const summary = {
    totalRows: 0,
    students: { created: 0, existing: 0 },
    cards: { created: 0, existing: 0 },
    attendance: { created: 0, duplicateSkipped: 0, failed: 0 },
    errors: [],
  };

  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found at: ${filePath}`);
  }

  const rows = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => rows.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  summary.totalRows = rows.length;

  const processedStudentsInRun = new Set();
  const processedCardsInRun = new Set();

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const rowNum = index + 2; // +1 for 0-index, +1 for header

    // Detect column keys case-insensitively
    const getCol = (...names) => {
      for (const name of names) {
        for (const key of Object.keys(row)) {
          if (key.trim().toLowerCase() === name.toLowerCase()) {
            return (row[key] || '').trim();
          }
        }
      }
      return '';
    };

    const rawName = getCol('Name', 'CardHolderName', 'StudentName', 'Student Name', 'Column C');
    const rawDate = getCol('Date', 'AttendanceDate', 'DATE');
    const rawTime = getCol('Time', 'CheckInTime', 'TIME');
    const rawStudentId = getCol('StudentId', 'StudentID', 'ID', 'RollNo');
    const rawCardUid = getCol('CardUid', 'CardUID', 'UID');
    const rawClassName = getCol('Class', 'ClassName', 'Department') || 'Standard Class';

    // Ignore completely empty row
    if (!rawName && !rawDate && !rawStudentId) {
      continue;
    }

    if (!rawName) {
      summary.attendance.failed++;
      summary.errors.push(`Row ${rowNum}: Missing student/cardholder name. Row skipped.`);
      continue;
    }

    if (!rawDate) {
      summary.attendance.failed++;
      summary.errors.push(`Row ${rowNum}: Missing date for '${rawName}'. Row skipped.`);
      continue;
    }

    const dt = parseDateTime(rawDate, rawTime);
    if (!dt || !dt.isValid) {
      summary.attendance.failed++;
      summary.errors.push(`Row ${rowNum}: Invalid date/time format '${rawDate} ${rawTime}'. Row skipped.`);
      continue;
    }

    const attendanceDateStr = dt.toFormat('yyyy-MM-dd');
    const checkInTimeJS = dt.toJSDate();

    // Generate or format deterministic studentId if absent
    const studentId = rawStudentId
      ? rawStudentId.toUpperCase()
      : `STU_${rawName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;

    // Generate or normalize cardUid
    const cardUid = rawCardUid
      ? RfidCard.normalizeUid(rawCardUid)
      : `LEGACY_${rawName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;

    // 1. Process Student
    let student = await Student.findOne({ studentId });
    if (!processedStudentsInRun.has(studentId)) {
      processedStudentsInRun.add(studentId);
      if (!student) {
        summary.students.created++;
        if (!dryRun) {
          student = await Student.create({
            studentId,
            name: rawName,
            className: rawClassName,
            status: 'active',
          });
        }
      } else {
        summary.students.existing++;
      }
    }

    // 2. Process RFID Card
    let card = await RfidCard.findOne({ cardUid });
    if (!processedCardsInRun.has(cardUid)) {
      processedCardsInRun.add(cardUid);
      if (!card) {
        summary.cards.created++;
        if (!dryRun) {
          card = await RfidCard.create({
            cardUid,
            studentId,
            storedTagData: rawName, // Preserves legacy tag block 2 data
            status: 'active',
          });
        }
      } else {
        summary.cards.existing++;
      }
    }

    // 3. Process Attendance Record
    const existingAttendance = await Attendance.findOne({
      studentId,
      attendanceDate: attendanceDateStr,
    });

    if (existingAttendance) {
      summary.attendance.duplicateSkipped++;
    } else {
      summary.attendance.created++;
      if (!dryRun) {
        const status = isLateArrival(checkInTimeJS) ? 'late' : 'present';
        await Attendance.create({
          studentId,
          cardUid,
          deviceId,
          attendanceDate: attendanceDateStr,
          checkInTime: checkInTimeJS,
          status,
        });
      }
    }
  }

  return summary;
}

// CLI Runner
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    let filePath = path.join(__dirname, '../../data/sample_google_sheets_export.csv');

    const fileArgIdx = args.indexOf('--file');
    if (fileArgIdx !== -1 && args[fileArgIdx + 1]) {
      filePath = path.resolve(args[fileArgIdx + 1]);
    }

    console.log('====================================================');
    console.log(`  Google Sheets -> MongoDB Migration Utility`);
    console.log(`  Target File:  ${filePath}`);
    console.log(`  Mode:         ${dryRun ? 'DRY RUN (Preview Only)' : 'LIVE MIGRATION (Writing to MongoDB)'}`);
    console.log('====================================================');

    try {
      await connectDB();
      const summary = await runMigration({ filePath, dryRun });

      console.log('\n---------------- MIGRATION SUMMARY -----------------');
      console.log(`Total Rows in CSV:       ${summary.totalRows}`);
      console.log(`Students:                ${summary.students.created} created, ${summary.students.existing} existing`);
      console.log(`RFID Cards:              ${summary.cards.created} created, ${summary.cards.existing} existing`);
      console.log(`Attendance Records:      ${summary.attendance.created} created`);
      console.log(`Duplicates Skipped:      ${summary.attendance.duplicateSkipped}`);
      console.log(`Failed / Skipped Rows:   ${summary.attendance.failed}`);
      if (summary.errors.length > 0) {
        console.log('\nWarnings / Errors:');
        summary.errors.forEach((e) => console.log(`  - ${e}`));
      }
      console.log('----------------------------------------------------');
      if (dryRun) {
        console.log('DRY RUN COMPLETE. No data was written to MongoDB.');
      } else {
        console.log('MIGRATION COMPLETE. Data has been successfully written to MongoDB.');
      }
    } catch (err) {
      console.error('Migration failed:', err.message);
      process.exitCode = 1;
    } finally {
      await disconnectDB();
    }
  })();
}

module.exports = { runMigration, parseDateTime };

