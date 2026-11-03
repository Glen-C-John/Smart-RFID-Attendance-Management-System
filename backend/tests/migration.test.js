const path = require('path');
const { runMigration } = require('../src/scripts/migrateGoogleSheets');
const Student = require('../src/models/Student');
const RfidCard = require('../src/models/RfidCard');
const Attendance = require('../src/models/Attendance');

describe('Google Sheets to MongoDB Migration Tests', () => {
  const sampleCsvPath = path.join(__dirname, '../data/sample_google_sheets_export.csv');

  it('should preview records during dry-run without writing to MongoDB', async () => {
    const summary = await runMigration({
      filePath: sampleCsvPath,
      dryRun: true,
    });

    expect(summary.totalRows).toBe(7);
    expect(summary.students.created).toBeGreaterThan(0);
    expect(summary.attendance.created).toBeGreaterThan(0);

    // Verify database remains empty during dry-run
    const studentCount = await Student.countDocuments();
    const attendanceCount = await Attendance.countDocuments();
    expect(studentCount).toBe(0);
    expect(attendanceCount).toBe(0);
  });

  // Scenario 8: Existing Google Sheets records imported correctly
  it('8. should successfully import records from Google Sheets CSV', async () => {
    const summary = await runMigration({
      filePath: sampleCsvPath,
      dryRun: false,
    });

    expect(summary.totalRows).toBe(7);
    expect(summary.students.created).toBe(4); // Mani, Rahul, Priya, Sneha
    expect(summary.cards.created).toBe(4);
    expect(summary.attendance.created).toBe(7);

    // Verify student Mani was created with correct data
    const studentMani = await Student.findOne({ studentId: 'STU001' });
    expect(studentMani).not.toBeNull();
    expect(studentMani.name).toBe('Mani');
    expect(studentMani.className).toBe('CSE-A');

    // Verify card was created preserving legacy block data
    const cardMani = await RfidCard.findOne({ cardUid: 'A1:B2:C3:D4' });
    expect(cardMani).not.toBeNull();
    expect(cardMani.storedTagData).toBe('Mani');

    // Verify attendance records imported
    const maniAttendance = await Attendance.find({ studentId: 'STU001' });
    expect(maniAttendance.length).toBe(3); // 2026-11-01, 2026-11-02, 2026-11-03
  });

  // Scenario 9: Running migration twice does not duplicate records
  it('9. should be idempotent - running migration twice does NOT duplicate records', async () => {
    // First run
    const firstRun = await runMigration({
      filePath: sampleCsvPath,
      dryRun: false,
    });
    expect(firstRun.attendance.created).toBe(7);
    expect(firstRun.attendance.duplicateSkipped).toBe(0);

    // Second run
    const secondRun = await runMigration({
      filePath: sampleCsvPath,
      dryRun: false,
    });

    // 0 new records should be created; all 7 should be skipped as duplicates
    expect(secondRun.students.created).toBe(0);
    expect(secondRun.students.existing).toBe(4);
    expect(secondRun.cards.created).toBe(0);
    expect(secondRun.cards.existing).toBe(4);
    expect(secondRun.attendance.created).toBe(0);
    expect(secondRun.attendance.duplicateSkipped).toBe(7);

    // Total counts in DB remain exact
    const studentCount = await Student.countDocuments();
    const attendanceCount = await Attendance.countDocuments();
    expect(studentCount).toBe(4);
    expect(attendanceCount).toBe(7);
  });
});

