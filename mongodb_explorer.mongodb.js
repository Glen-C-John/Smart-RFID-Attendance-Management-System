// =============================================================================
// MongoDB Playground for Antigravity & VS Code
// Database: rfid_attendance
//
// Click the "▶ Run" or "Execute" button at the top right of this editor to run!
// =============================================================================

// 1. Select the database
use('rfid_attendance');

// 2. View all Registered Students
console.log('--- 👨‍🎓 STUDENTS ---');
const students = db.getCollection('students').find({}).toArray();
console.log(students);

// 3. View all Registered RFID Cards
console.log('--- 🪪 RFID CARDS ---');
const cards = db.getCollection('rfidcards').find({}).toArray();
console.log(cards);

// 4. View Recent Attendance Records
console.log('--- 📅 RECENT ATTENDANCE RECORDS ---');
const attendances = db.getCollection('attendances').find({}).sort({ checkInTime: -1 }).limit(10).toArray();
console.log(attendances);

// 5. View System Settings
console.log('--- ⚙️ SYSTEM SETTINGS ---');
const settings = db.getCollection('settings').find({}).toArray();
console.log(settings);

// Return summary overview
({
  database: 'rfid_attendance',
  totalStudents: db.students.countDocuments(),
  totalCards: db.rfidcards.countDocuments(),
  totalAttendanceLogs: db.attendances.countDocuments(),
  students: db.students.find({}, { studentId: 1, name: 1, className: 1 }).toArray(),
  cards: db.rfidcards.find({}, { cardUid: 1, studentId: 1, storedTagData: 1, status: 1 }).toArray()
});

