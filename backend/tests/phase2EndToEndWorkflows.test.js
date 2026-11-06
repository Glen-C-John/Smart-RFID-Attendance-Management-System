const request = require('supertest');
const app = require('../src/app');
const config = require('../src/config');
const Student = require('../src/models/Student');
const RfidCard = require('../src/models/RfidCard');
const Attendance = require('../src/models/Attendance');
const Device = require('../src/models/Device');
const { getAttendanceDateString } = require('../src/utils/timezone');

describe('Phase 2 End-to-End Workflow Validation (Workflows A to F)', () => {
  let adminToken;
  const testDeviceId = 'ESP8266_E2E_GATE';
  const testDeviceKey = 'e2e_device_key_777';

  beforeEach(async () => {
    // Admin login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: config.adminUsername,
        password: config.adminPassword,
      });
    adminToken = loginRes.body.token;

    // Register active gate scanner device
    await Device.create({
      deviceId: testDeviceId,
      deviceName: 'E2E Main Gate Scanner',
      apiKey: testDeviceKey,
      location: 'Campus Entrance',
      status: 'active',
      firmwareVersion: '2.0.0',
      lastSeen: new Date(),
    });
  });

  // =========================================================================
  // WORKFLOW A: Full Lifecycle from Registration to Live Attendance
  // Admin login → Add student → Register RFID card → Scan card → MongoDB record → Dashboard update
  // =========================================================================
  it('Workflow A: Admin login → Add student → Register RFID card → Scan card → MongoDB record → Dashboard update', async () => {
    // 1. Add student
    const addStudentRes = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: 'STU_E2E_01',
        name: 'Aarav Patel',
        email: 'aarav@college.edu',
        className: 'CSE-A',
        department: 'Computer Science',
      });
    expect(addStudentRes.status).toBe(201);
    expect(addStudentRes.body.student.studentId).toBe('STU_E2E_01');

    // 2. Register RFID card
    const cardUid = '91:A2:B3:C4';
    const regCardRes = await request(app)
      .post('/api/v1/cards/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        cardUid,
        studentId: 'STU_E2E_01',
        storedTagData: 'Aarav',
      });
    expect(regCardRes.status).toBe(201);
    expect(regCardRes.body.card.cardUid).toBe('91:A2:B3:C4');

    // 3. Scan card from ESP8266 hardware node
    const scanRes = await request(app)
      .post('/api/v1/device/scan')
      .set('x-device-id', testDeviceId)
      .set('x-device-key', testDeviceKey)
      .send({
        cardUid,
        timestamp: new Date().toISOString(),
      });
    expect(scanRes.status).toBe(200);
    expect(scanRes.body.success).toBe(true);
    expect(scanRes.body.studentName).toBe('Aarav Patel');
    expect(scanRes.body.action).toBe('check_in');

    // 4. Verify MongoDB record
    const todayStr = getAttendanceDateString();
    const record = await Attendance.findOne({
      studentId: 'STU_E2E_01',
      attendanceDate: todayStr,
    });
    expect(record).toBeDefined();
    expect(record.cardUid).toBe(cardUid);
    expect(record.deviceId).toBe(testDeviceId);
    expect(record.status).toMatch(/present|late/);

    // 5. Verify Dashboard counters reflect the new attendee
    const dashRes = await request(app)
      .get('/api/v1/dashboard/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.overview.totalActiveStudents).toBe(1);
    expect(dashRes.body.overview.presentToday).toBe(1);
    expect(dashRes.body.overview.absentToday).toBe(0);
    expect(dashRes.body.overview.attendancePercentage).toBe(100);
  });

  // =========================================================================
  // WORKFLOW B: Student Profile & Historical Attendance Inspection
  // Admin login → Search student → View profile → View attendance history → Export report
  // =========================================================================
  it('Workflow B: Admin login → Search student → View profile → View attendance history → Export report', async () => {
    // Setup test student with attendance
    await Student.create({
      studentId: 'STU_E2E_02',
      name: 'Diya Sengupta',
      className: 'ECE-B',
      department: 'Electronics',
    });
    await Attendance.create({
      studentId: 'STU_E2E_02',
      cardUid: '12:99:88:77',
      deviceId: testDeviceId,
      attendanceDate: '2026-11-05',
      checkInTime: new Date('2026-11-05T09:00:00Z'),
      status: 'present',
    });

    // 1. Search student
    const searchRes = await request(app)
      .get('/api/v1/students?search=Diya')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.students.length).toBe(1);
    expect(searchRes.body.students[0].studentId).toBe('STU_E2E_02');

    // 2. View profile details
    const profileRes = await request(app)
      .get('/api/v1/students/STU_E2E_02')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.student.name).toBe('Diya Sengupta');

    // 3. View attendance history for student
    const histRes = await request(app)
      .get('/api/v1/attendance/student/STU_E2E_02')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(histRes.status).toBe(200);
    expect(histRes.body.records.length).toBe(1);
    expect(histRes.body.records[0].studentName).toBe('Diya Sengupta');

    // 4. Export student-specific report
    const repRes = await request(app)
      .get('/api/v1/reports?type=custom&startDate=2026-11-01&endDate=2026-11-06&studentId=STU_E2E_02')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(repRes.status).toBe(200);
    expect(repRes.body.summary.totalSessions).toBe(1);
    expect(repRes.body.records[0].studentId).toBe('STU_E2E_02');
  });

  // =========================================================================
  // WORKFLOW C: Card Security & Blocking
  // Admin login → Block RFID card → Attempt card scan → Verify rejection
  // =========================================================================
  it('Workflow C: Admin login → Block RFID card → Attempt card scan → Verify rejection', async () => {
    const cardUid = '44:55:66:77';
    await Student.create({
      studentId: 'STU_E2E_03',
      name: 'Blocked Student',
      className: 'CSE-A',
      status: 'active',
    });
    await RfidCard.create({
      cardUid,
      studentId: 'STU_E2E_03',
      status: 'active',
    });

    // 1. Block RFID card
    const blockRes = await request(app)
      .put(`/api/v1/cards/${cardUid}/block`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(blockRes.status).toBe(200);
    expect(blockRes.body.card.status).toBe('blocked');

    // 2. Hardware scan attempt
    const scanRes = await request(app)
      .post('/api/v1/device/scan')
      .set('x-device-id', testDeviceId)
      .set('x-device-key', testDeviceKey)
      .send({ cardUid });
    expect(scanRes.status).toBe(403);
    expect(scanRes.body.success).toBe(false);
    expect(scanRes.body.message).toMatch(/blocked/i);
  });

  // =========================================================================
  // WORKFLOW D: Administrative Attendance Correction
  // Admin login → Correct attendance → Add reason → Verify audit log
  // =========================================================================
  it('Workflow D: Admin login → Correct attendance → Add reason → Verify audit log', async () => {
    await Student.create({
      studentId: 'STU_E2E_04',
      name: 'Correction Candidate',
      className: 'CSE-A',
    });
    const record = await Attendance.create({
      studentId: 'STU_E2E_04',
      cardUid: '88:99:00:11',
      deviceId: testDeviceId,
      attendanceDate: '2026-11-06',
      checkInTime: new Date('2026-11-06T09:45:00Z'),
      status: 'late',
    });

    // 1. Correct status with audited reason
    const correctRes = await request(app)
      .patch(`/api/v1/attendance/${record._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'present',
        reason: 'College bus was delayed due to road construction on MG Road',
      });
    expect(correctRes.status).toBe(200);
    expect(correctRes.body.attendance.status).toBe('present');

    // 2. Verify audit log entry in MongoDB
    const updated = await Attendance.findById(record._id);
    expect(updated.auditLog.length).toBe(1);
    expect(updated.auditLog[0].previousValues.status).toBe('late');
    expect(updated.auditLog[0].newValues.status).toBe('present');
    expect(updated.auditLog[0].reason).toBe('College bus was delayed due to road construction on MG Road');
    expect(updated.auditLog[0].modifiedBy).toBe(config.adminUsername);
  });

  // =========================================================================
  // WORKFLOW E: Offline Queue Synchronization & Duplicate Prevention
  // ESP8266 disconnects → Attempts offline buffering → Reconnects → Synchronizes events → Verify no duplicates
  // =========================================================================
  it('Workflow E: ESP8266 disconnects → Buffers offline → Synchronizes → Verify no duplicates', async () => {
    const cardUid = 'AA:BB:CC:DD';
    await Student.create({
      studentId: 'STU_E2E_05',
      name: 'Offline Student',
      className: 'CSE-A',
      status: 'active',
    });
    await RfidCard.create({
      cardUid,
      studentId: 'STU_E2E_05',
      status: 'active',
    });

    const eventId = 'esp8266_offline_event_uuid_101';
    const originalEventTimestamp = '2026-11-05T08:52:00+05:30';

    // 1. First sync attempt (ESP8266 flushes offline queue)
    const syncRes1 = await request(app)
      .post('/api/v1/device/scan')
      .set('x-device-id', testDeviceId)
      .set('x-device-key', testDeviceKey)
      .send({
        cardUid,
        timestamp: originalEventTimestamp,
        eventId,
      });
    expect(syncRes1.status).toBe(200);
    expect(syncRes1.body.success).toBe(true);

    // 2. Re-send exact same event (network retry / duplicate flush)
    const syncRes2 = await request(app)
      .post('/api/v1/device/scan')
      .set('x-device-id', testDeviceId)
      .set('x-device-key', testDeviceKey)
      .send({
        cardUid,
        timestamp: originalEventTimestamp,
        eventId,
      });
    expect(syncRes2.status).toBe(200);
    expect(syncRes2.body.message).toMatch(/idempotent retry/i);

    // 3. Verify exactly ONE attendance record exists in MongoDB
    const records = await Attendance.find({ studentId: 'STU_E2E_05' });
    expect(records.length).toBe(1);
    expect(records[0].attendanceDate).toBe('2026-11-05');
  });

  // =========================================================================
  // WORKFLOW F: Monthly Reporting & Filtering
  // Admin login → Filter attendance → Generate monthly report → Verify contents
  // =========================================================================
  it('Workflow F: Admin login → Filter attendance → Generate monthly report → Verify contents', async () => {
    // Setup class attendance for November
    await Student.create([
      { studentId: 'STU_M1', name: 'M1', className: 'CSE-A', status: 'active' },
      { studentId: 'STU_M2', name: 'M2', className: 'CSE-A', status: 'active' },
      { studentId: 'STU_M3', name: 'M3', className: 'MECH-A', status: 'active' },
    ]);

    await Attendance.create([
      { studentId: 'STU_M1', cardUid: '11:11:11:11', deviceId: testDeviceId, attendanceDate: '2026-11-01', checkInTime: new Date(), status: 'present' },
      { studentId: 'STU_M2', cardUid: '22:22:22:22', deviceId: testDeviceId, attendanceDate: '2026-11-01', checkInTime: new Date(), status: 'late' },
      { studentId: 'STU_M3', cardUid: '33:33:33:33', deviceId: testDeviceId, attendanceDate: '2026-11-01', checkInTime: new Date(), status: 'present' },
    ]);

    // Query CSE-A monthly report
    const res = await request(app)
      .get('/api/v1/reports?type=monthly&startDate=2026-11-01&endDate=2026-11-30&className=CSE-A')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.totalActiveStudents).toBe(2); // Only CSE-A
    expect(res.body.records.length).toBe(2);
    res.body.records.forEach((r) => {
      expect(r.className).toBe('CSE-A');
    });
  });
});
