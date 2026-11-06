const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const config = require('../src/config');
const Student = require('../src/models/Student');
const RfidCard = require('../src/models/RfidCard');
const Attendance = require('../src/models/Attendance');
const Device = require('../src/models/Device');
const Setting = require('../src/models/Setting');
const { getAttendanceDateString } = require('../src/utils/timezone');

describe('Phase 2 Comprehensive QA, Stabilization & Security Tests', () => {
  let adminToken;
  const adminApiKey = config.adminApiKey;
  const testDeviceId = 'ESP8266_QA_NODE';
  const testDeviceKey = 'qa_device_key_sec_99';

  beforeEach(async () => {
    // 1. Authenticate admin
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: config.adminUsername,
        password: config.adminPassword,
      });
    adminToken = loginRes.body.token;

    // 2. Register test device
    await Device.create({
      deviceId: testDeviceId,
      deviceName: 'QA Entrance Scanner',
      apiKey: testDeviceKey,
      location: 'North Gate',
      status: 'active',
      firmwareVersion: '2.0.0',
      lastSeen: new Date(),
    });
  });

  // =========================================================================
  // 1. ADMIN AUTHENTICATION
  // =========================================================================
  describe('1. Admin Authentication Module', () => {
    it('1.1 should successfully login with valid credentials and return JWT', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: config.adminUsername, password: config.adminPassword });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('admin');
    });

    it('1.2 should reject login with incorrect password (401)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: config.adminUsername, password: 'wrongpassword' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('1.3 should reject login with incorrect username (401)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'nonexistent_admin', password: config.adminPassword });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('1.4 should reject login with empty credentials (400)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: '', password: '' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('1.5 should reject expired JWT token (401)', async () => {
      const expiredToken = jwt.sign(
        { username: config.adminUsername, role: 'admin' },
        config.jwtSecret,
        { expiresIn: '-1s' }
      );
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/expired/i);
    });

    it('1.6 should reject tampered or invalid JWT token (401)', async () => {
      const tamperedToken = adminToken.slice(0, -6) + 'abcdef';
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('1.7 should reject missing authentication token on protected routes (401)', async () => {
      const res = await request(app).get('/api/v1/students');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('1.8 should allow access via x-admin-key header', async () => {
      const res = await request(app)
        .get('/api/v1/students')
        .set('x-admin-key', adminApiKey);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('1.9 should allow logout endpoint to succeed', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // =========================================================================
  // 2. STUDENT MANAGEMENT
  // =========================================================================
  describe('2. Student Management Module', () => {
    it('2.1 should create a new student with trimmed strings and uppercase ID', async () => {
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: '  stu901  ',
          name: '  Ananya Sharma  ',
          email: 'ananya@college.edu',
          phone: '+919876500001',
          className: '  CSE-A  ',
          department: 'Computer Science',
        });
      expect(res.status).toBe(201);
      expect(res.body.student.studentId).toBe('STU901');
      expect(res.body.student.name).toBe('Ananya Sharma');
      expect(res.body.student.className).toBe('CSE-A');
      expect(res.body.student.status).toBe('active');
    });

    it('2.2 should reject missing required fields (400)', async () => {
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ studentId: 'STU902' });
      expect(res.status).toBe(400);
    });

    it('2.3 should reject empty or whitespace-only name and class (400)', async () => {
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: 'STU903',
          name: '   ',
          className: '   ',
        });
      expect(res.status).toBe(400);
    });

    it('2.4 should reject duplicate studentId (409)', async () => {
      await Student.create({
        studentId: 'STU904',
        name: 'Original Student',
        className: 'CSE-A',
      });
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: 'STU904',
          name: 'Duplicate Student',
          className: 'CSE-A',
        });
      expect(res.status).toBe(409);
    });

    it('2.5 should reject invalid email format (400)', async () => {
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: 'STU905',
          name: 'Bad Email Student',
          className: 'CSE-A',
          email: 'not-an-email',
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/validation/i);
    });

    it('2.6 should handle special regex characters in search without error', async () => {
      await Student.create({
        studentId: 'STU906',
        name: 'Special (Regex) [Student] + Test',
        className: 'CSE-A',
      });

      const res = await request(app)
        .get('/api/v1/students?search=[Student]')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.students.length).toBe(1);
      expect(res.body.students[0].studentId).toBe('STU906');
    });

    it('2.7 should clamp pagination parameters and avoid unbounded queries', async () => {
      const res = await request(app)
        .get('/api/v1/students?page=-1&limit=9999')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(500); // Clamped to max 500
    });

    it('2.8 should soft-delete / deactivate student and block associated cards', async () => {
      await Student.create({
        studentId: 'STU907',
        name: 'Deactivate Me',
        className: 'CSE-A',
        status: 'active',
      });
      await RfidCard.create({
        cardUid: '11:22:33:44',
        studentId: 'STU907',
        status: 'active',
      });

      const res = await request(app)
        .delete('/api/v1/students/STU907')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const student = await Student.findOne({ studentId: 'STU907' });
      expect(student.status).toBe('inactive');

      const card = await RfidCard.findOne({ cardUid: '11:22:33:44' });
      expect(card.status).toBe('blocked');
    });

    it('2.9 should refuse force deletion when student has attendance history (400)', async () => {
      await Student.create({
        studentId: 'STU908',
        name: 'Historical Student',
        className: 'CSE-A',
      });
      await Attendance.create({
        studentId: 'STU908',
        cardUid: '22:33:44:55',
        deviceId: testDeviceId,
        attendanceDate: '2026-11-01',
        checkInTime: new Date(),
        status: 'present',
      });

      const res = await request(app)
        .delete('/api/v1/students/STU908?force=true')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Cannot permanently delete student.*existing attendance records/i);

      // Verify records remain in MongoDB
      const studentStillExists = await Student.findOne({ studentId: 'STU908' });
      expect(studentStillExists).toBeDefined();
    });
  });

  // =========================================================================
  // 3. RFID CARD MANAGEMENT
  // =========================================================================
  describe('3. RFID Card Management Module', () => {
    beforeEach(async () => {
      await Student.create({
        studentId: 'STU920',
        name: 'Active RFID User',
        className: 'CSE-A',
        status: 'active',
      });
      await Student.create({
        studentId: 'STU921',
        name: 'Inactive RFID User',
        className: 'CSE-A',
        status: 'inactive',
      });
    });

    it('3.1 should normalize lowercase and hyphenated UIDs consistently', async () => {
      const res = await request(app)
        .post('/api/v1/cards/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          cardUid: 'aa-bb-cc-dd',
          studentId: 'STU920',
        });
      expect(res.status).toBe(201);
      expect(res.body.card.cardUid).toBe('AA:BB:CC:DD');
    });

    it('3.2 should handle missing leading zeros in byte tokens (e.g. 7:a7:17:98 -> 07:A7:17:98)', async () => {
      const res = await request(app)
        .post('/api/v1/cards/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          cardUid: '7:a7:17:98',
          studentId: 'STU920',
        });
      expect(res.status).toBe(201);
      expect(res.body.card.cardUid).toBe('07:A7:17:98');
    });

    it('3.3 should reject invalid or malformed UID format (400)', async () => {
      const res = await request(app)
        .post('/api/v1/cards/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          cardUid: 'NOT_A_VALID_HEX',
          studentId: 'STU920',
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid card UID format/i);
    });

    it('3.4 should reject card registration for an inactive student (400)', async () => {
      const res = await request(app)
        .post('/api/v1/cards/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          cardUid: '33:44:55:66',
          studentId: 'STU921',
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/inactive/i);
    });

    it('3.5 should reject assigning an already active card to another student (409)', async () => {
      await Student.create({ studentId: 'STU922', name: 'Other User', className: 'CSE-A', status: 'active' });
      await RfidCard.create({ cardUid: '55:66:77:88', studentId: 'STU920', status: 'active' });

      const res = await request(app)
        .post('/api/v1/cards/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          cardUid: '55:66:77:88',
          studentId: 'STU922',
        });
      expect(res.status).toBe(409);
    });

    it('3.6 should block an active card and reactivate it idempotently', async () => {
      await RfidCard.create({ cardUid: '66:77:88:99', studentId: 'STU920', status: 'active' });

      // Block
      const blockRes = await request(app)
        .put('/api/v1/cards/66:77:88:99/block')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(blockRes.status).toBe(200);
      expect(blockRes.body.card.status).toBe('blocked');

      // Block again (idempotent)
      const blockAgain = await request(app)
        .put('/api/v1/cards/66:77:88:99/block')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(blockAgain.status).toBe(200);
      expect(blockAgain.body.card.status).toBe('blocked');

      // Reactivate
      const activateRes = await request(app)
        .put('/api/v1/cards/66:77:88:99/activate')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(activateRes.status).toBe(200);
      expect(activateRes.body.card.status).toBe('active');
    });

    it('3.7 should support card replacement workflow while preserving historical attendance', async () => {
      const studentId = 'STU920';
      const oldCardUid = '01:02:03:04';
      const newCardUid = '05:06:07:08';

      // 1. Initial card and attendance record
      await RfidCard.create({ cardUid: oldCardUid, studentId, status: 'active' });
      await Attendance.create({
        studentId,
        cardUid: oldCardUid,
        deviceId: testDeviceId,
        attendanceDate: '2026-11-01',
        checkInTime: new Date('2026-11-01T09:00:00Z'),
        status: 'present',
      });

      // 2. Block old card (e.g. reported lost)
      await request(app)
        .put(`/api/v1/cards/${oldCardUid}/block`)
        .set('Authorization', `Bearer ${adminToken}`);

      // 3. Register new replacement card
      const regRes = await request(app)
        .post('/api/v1/cards/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cardUid: newCardUid, studentId });
      expect(regRes.status).toBe(201);

      // 4. Verify old card is rejected during scan
      const oldScanRes = await request(app)
        .post('/api/v1/device/scan')
        .set('x-device-id', testDeviceId)
        .set('x-device-key', testDeviceKey)
        .send({ cardUid: oldCardUid });
      expect(oldScanRes.status).toBe(403);

      // 5. Verify new card records attendance successfully
      const newScanRes = await request(app)
        .post('/api/v1/device/scan')
        .set('x-device-id', testDeviceId)
        .set('x-device-key', testDeviceKey)
        .send({ cardUid: newCardUid, timestamp: '2026-11-06T09:00:00+05:30' });
      expect(newScanRes.status).toBe(200);
      expect(newScanRes.body.success).toBe(true);

      // 6. Verify historical attendance retained old UID
      const history = await Attendance.find({ studentId }).sort({ attendanceDate: 1 });
      expect(history.length).toBe(2);
      expect(history[0].cardUid).toBe(oldCardUid);
      expect(history[1].cardUid).toBe(newCardUid);
    });
  });

  // =========================================================================
  // 4. ATTENDANCE SCAN & COOLDOWN RULES
  // =========================================================================
  describe('4. Attendance Processing & Duplicate Cooldown', () => {
    const cardUid = '77:88:99:00';
    const studentId = 'STU930';

    beforeEach(async () => {
      await Student.create({
        studentId,
        name: 'Attendance Tester',
        className: 'CSE-A',
        status: 'active',
      });
      await RfidCard.create({
        cardUid,
        studentId,
        status: 'active',
      });
    });

    it('4.1 should record check-in on first scan', async () => {
      const res = await request(app)
        .post('/api/v1/device/scan')
        .set('x-device-id', testDeviceId)
        .set('x-device-key', testDeviceKey)
        .send({
          cardUid,
          timestamp: '2026-11-06T09:05:00+05:30',
        });
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('check_in');
      expect(res.body.studentName).toBe('Attendance Tester');
    });

    it('4.2 should ignore duplicate scan within cooldown window', async () => {
      // First scan
      await request(app)
        .post('/api/v1/device/scan')
        .set('x-device-id', testDeviceId)
        .set('x-device-key', testDeviceKey)
        .send({ cardUid, timestamp: '2026-11-06T09:05:00+05:30' });

      // Immediate second scan (10 seconds later, < 60s cooldown)
      const res = await request(app)
        .post('/api/v1/device/scan')
        .set('x-device-id', testDeviceId)
        .set('x-device-key', testDeviceKey)
        .send({ cardUid, timestamp: '2026-11-06T09:05:10+05:30' });

      expect(res.status).toBe(200);
      expect(res.body.isDuplicate).toBe(true);
      expect(res.body.message).toMatch(/cooldown/i);
    });

    it('4.3 should not check-out if minimum check-out interval is not met', async () => {
      // First scan at 09:00
      await request(app)
        .post('/api/v1/device/scan')
        .set('x-device-id', testDeviceId)
        .set('x-device-key', testDeviceKey)
        .send({ cardUid, timestamp: '2026-11-06T09:00:00+05:30' });

      // Scan at 09:02 (2 minutes later, > 60s cooldown but < 5 min checkoutMinIntervalMinutes)
      const res = await request(app)
        .post('/api/v1/device/scan')
        .set('x-device-id', testDeviceId)
        .set('x-device-key', testDeviceKey)
        .send({ cardUid, timestamp: '2026-11-06T09:02:00+05:30' });

      expect(res.status).toBe(200);
      expect(res.body.action).toBeUndefined();
      expect(res.body.message).toMatch(/Minimum check-out window/i);
    });

    it('4.4 should record check-out when interval is satisfied', async () => {
      // First scan at 09:00
      await request(app)
        .post('/api/v1/device/scan')
        .set('x-device-id', testDeviceId)
        .set('x-device-key', testDeviceKey)
        .send({ cardUid, timestamp: '2026-11-06T09:00:00+05:30' });

      // Scan at 09:10 (10 minutes later >= 5 min checkout interval)
      const res = await request(app)
        .post('/api/v1/device/scan')
        .set('x-device-id', testDeviceId)
        .set('x-device-key', testDeviceKey)
        .send({ cardUid, timestamp: '2026-11-06T09:10:00+05:30' });

      expect(res.status).toBe(200);
      expect(res.body.action).toBe('check_out');
      expect(res.body.checkOutTime).toBeDefined();
    });

    it('4.5 should preserve offline event timestamp rather than server receipt time', async () => {
      const offlineEventTimestamp = '2026-11-04T08:50:00+05:30';
      const res = await request(app)
        .post('/api/v1/device/scan')
        .set('x-device-id', testDeviceId)
        .set('x-device-key', testDeviceKey)
        .send({
          cardUid,
          timestamp: offlineEventTimestamp,
          eventId: 'offline_uuid_001',
        });

      expect(res.status).toBe(200);
      const record = await Attendance.findOne({ eventId: 'offline_uuid_001' });
      expect(record.attendanceDate).toBe('2026-11-04');
      expect(new Date(record.checkInTime).toISOString()).toBe(new Date(offlineEventTimestamp).toISOString());
    });
  });

  // =========================================================================
  // 5. ATTENDANCE CORRECTION & AUDIT TRAIL
  // =========================================================================
  describe('5. Manual Attendance Correction & Audit Trail', () => {
    let attendanceRecord;

    beforeEach(async () => {
      await Student.create({
        studentId: 'STU940',
        name: 'Correction Student',
        className: 'CSE-B',
      });
      attendanceRecord = await Attendance.create({
        studentId: 'STU940',
        cardUid: '12:34:56:78',
        deviceId: testDeviceId,
        attendanceDate: '2026-11-06',
        checkInTime: new Date('2026-11-06T09:40:00Z'),
        status: 'late',
      });
    });

    it('5.1 should reject correction if justification reason is missing (400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/attendance/${attendanceRecord._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'present', reason: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/reason is strictly required/i);
    });

    it('5.2 should reject correction if checkOutTime is earlier than checkInTime (400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/attendance/${attendanceRecord._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          checkInTime: '2026-11-06T10:00:00Z',
          checkOutTime: '2026-11-06T09:00:00Z',
          reason: 'Erroneous timestamp test',
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Check-out time cannot be earlier than check-in time/i);
    });

    it('5.3 should record complete audit log on successful correction', async () => {
      const res = await request(app)
        .patch(`/api/v1/attendance/${attendanceRecord._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'present',
          reason: 'Approved medical certificate submitted to HOD',
        });

      expect(res.status).toBe(200);
      expect(res.body.attendance.status).toBe('present');
      expect(res.body.attendance.auditLog.length).toBe(1);

      const entry = res.body.attendance.auditLog[0];
      expect(entry.modifiedBy).toBe(config.adminUsername);
      expect(entry.action).toBe('manual_correction');
      expect(entry.previousValues.status).toBe('late');
      expect(entry.newValues.status).toBe('present');
      expect(entry.reason).toBe('Approved medical certificate submitted to HOD');
      expect(entry.timestamp).toBeDefined();
    });
  });

  // =========================================================================
  // 6. DEVICE MANAGEMENT & HEARTBEAT
  // =========================================================================
  describe('6. Device Management & Node Connectivity', () => {
    it('6.1 should allow device ping and heartbeat, updating lastSeen timestamp', async () => {
      const pingRes = await request(app)
        .post('/api/v1/device/ping')
        .set('x-device-id', testDeviceId)
        .set('x-device-key', testDeviceKey);
      expect(pingRes.status).toBe(200);
      expect(pingRes.body.message).toBe('Pong');

      const hbRes = await request(app)
        .post('/api/v1/device/heartbeat')
        .set('x-device-id', testDeviceId)
        .set('x-device-key', testDeviceKey);
      expect(hbRes.status).toBe(200);
      expect(hbRes.body.message).toBe('Heartbeat acknowledged');
    });

    it('6.2 should reject unauthenticated device requests (401)', async () => {
      const res = await request(app)
        .post('/api/v1/device/scan')
        .send({ cardUid: '11:22:33:44' });
      expect(res.status).toBe(401);
    });

    it('6.3 should reject revoked or inactive devices (403)', async () => {
      await Device.findOneAndUpdate({ deviceId: testDeviceId }, { status: 'revoked' });

      const res = await request(app)
        .post('/api/v1/device/ping')
        .set('x-device-id', testDeviceId)
        .set('x-device-key', testDeviceKey);
      expect(res.status).toBe(403);
    });

    it('6.4 should not expose device apiKey in administrative device lists', async () => {
      const res = await request(app)
        .get('/api/v1/devices')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.devices.length).toBeGreaterThan(0);
      res.body.devices.forEach((d) => {
        expect(d.apiKey).toBeUndefined();
        expect(d.isOnline).toBeDefined();
      });
    });
  });

  // =========================================================================
  // 7. SETTINGS & PERSISTENCE
  // =========================================================================
  describe('7. Settings Persistence & Input Validation', () => {
    it('7.1 should reject invalid 24-hr time formats (400)', async () => {
      const res = await request(app)
        .put('/api/v1/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ workDayStartTime: '25:00' });
      expect(res.status).toBe(400);
    });

    it('7.2 should reject negative interval values (400)', async () => {
      const res = await request(app)
        .put('/api/v1/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cooldownSeconds: -10 });
      expect(res.status).toBe(400);
    });

    it('7.3 should save valid settings and update runtime config', async () => {
      const res = await request(app)
        .put('/api/v1/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          institutionName: 'Global Institute of Advanced IoT',
          workDayStartTime: '08:30',
          lateThresholdTime: '09:00',
          cooldownSeconds: 45,
        });

      expect(res.status).toBe(200);
      expect(res.body.settings.institutionName).toBe('Global Institute of Advanced IoT');
      expect(config.attendance.cooldownSeconds).toBe(45);
      expect(config.attendance.workDayStartTime).toBe('08:30');
    });
  });

  // =========================================================================
  // 8. DASHBOARD & ANALYTICS ACCURACY
  // =========================================================================
  describe('8. Dashboard Accuracy & Mathematical Integrity', () => {
    it('8.1 should return accurate overview with 0 students without division by zero', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/overview')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.overview.totalStudents).toBe(0);
      expect(res.body.overview.attendancePercentage).toBe(0);
      expect(isNaN(res.body.overview.attendancePercentage)).toBe(false);
    });

    it('8.2 should accurately compute attendance percentage and absent count with real data', async () => {
      // Create 4 students
      await Student.create([
        { studentId: 'STU1', name: 'S1', className: 'CSE-A', status: 'active' },
        { studentId: 'STU2', name: 'S2', className: 'CSE-A', status: 'active' },
        { studentId: 'STU3', name: 'S3', className: 'CSE-B', status: 'active' },
        { studentId: 'STU4', name: 'S4', className: 'CSE-B', status: 'inactive' }, // 3 active students
      ]);

      const todayStr = getAttendanceDateString();
      // 2 students present (1 present, 1 late)
      await Attendance.create([
        { studentId: 'STU1', cardUid: '01:01:01:01', deviceId: testDeviceId, attendanceDate: todayStr, checkInTime: new Date(), status: 'present' },
        { studentId: 'STU2', cardUid: '02:02:02:02', deviceId: testDeviceId, attendanceDate: todayStr, checkInTime: new Date(), status: 'late' },
      ]);

      const res = await request(app)
        .get('/api/v1/dashboard/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.overview.totalActiveStudents).toBe(3);
      expect(res.body.overview.presentToday).toBe(2);
      expect(res.body.overview.lateToday).toBe(1);
      expect(res.body.overview.absentToday).toBe(1); // 3 - 2 = 1
      expect(res.body.overview.attendancePercentage).toBe(67); // round(2/3 * 100) = 67%
    });
  });
});
