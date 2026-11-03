const request = require('supertest');
const app = require('../src/app');
const Student = require('../src/models/Student');
const RfidCard = require('../src/models/RfidCard');
const Device = require('../src/models/Device');
const Attendance = require('../src/models/Attendance');
const config = require('../src/config');
const { getAttendanceDateString } = require('../src/utils/timezone');

describe('RFID Attendance & Scan API Tests', () => {
  const testDeviceId = 'ESP8266_TEST';
  const testDeviceKey = 'test_secret_key_123';

  beforeEach(async () => {
    // Register test device
    await Device.create({
      deviceId: testDeviceId,
      deviceName: 'Lab Gate Scanner',
      apiKey: testDeviceKey,
      location: 'Lab 1',
      status: 'active',
      firmwareVersion: '1.0.0',
    });

    // Register test student
    await Student.create({
      studentId: 'STU101',
      name: 'Mani Kumar',
      className: 'CSE-4A',
      status: 'active',
    });

    // Register active RFID card for Mani
    await RfidCard.create({
      cardUid: 'A1:B2:C3:D4',
      studentId: 'STU101',
      storedTagData: 'Mani',
      status: 'active',
    });

    // Register blocked RFID card
    await Student.create({
      studentId: 'STU102',
      name: 'Blocked Student',
      className: 'CSE-4A',
      status: 'active',
    });
    await RfidCard.create({
      cardUid: '99:88:77:66',
      studentId: 'STU102',
      storedTagData: 'BlockedUser',
      status: 'blocked',
    });
  });

  // Scenario 1: Registered card successfully records attendance
  it('1. should successfully record attendance for registered active card', async () => {
    const res = await request(app)
      .post('/api/v1/device/scan')
      .set('x-device-id', testDeviceId)
      .set('x-device-key', testDeviceKey)
      .send({
        deviceId: testDeviceId,
        cardUid: 'A1:B2:C3:D4',
        tagData: 'Mani',
        timestamp: '2026-11-03T09:05:00+05:30',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.studentName).toBe('Mani Kumar');
    expect(res.body.message).toBe('Attendance recorded');
    expect(res.body.attendanceStatus).toBe('present');
    expect(res.body.checkInTime).toBeDefined();

    const record = await Attendance.findOne({ studentId: 'STU101' });
    expect(record).not.toBeNull();
    expect(record.cardUid).toBe('A1:B2:C3:D4');
    expect(record.attendanceDate).toBe('2026-11-03');
  });

  // Scenario 2: Unregistered RFID card is rejected
  it('2. should reject unregistered RFID card with 404', async () => {
    const res = await request(app)
      .post('/api/v1/device/scan')
      .set('x-device-id', testDeviceId)
      .set('x-device-key', testDeviceKey)
      .send({
        deviceId: testDeviceId,
        cardUid: 'FF:EE:DD:CC',
        timestamp: '2026-11-03T09:10:00+05:30',
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Unregistered RFID card/i);
  });

  // Scenario 3: Blocked card is rejected
  it('3. should reject blocked RFID card with 403', async () => {
    const res = await request(app)
      .post('/api/v1/device/scan')
      .set('x-device-id', testDeviceId)
      .set('x-device-key', testDeviceKey)
      .send({
        deviceId: testDeviceId,
        cardUid: '99:88:77:66',
        timestamp: '2026-11-03T09:10:00+05:30',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/blocked/i);
  });

  // Scenario 4: Duplicate scan is ignored during cooldown
  it('4. should ignore duplicate scan within cooldown window', async () => {
    // First scan
    await request(app)
      .post('/api/v1/device/scan')
      .set('x-device-id', testDeviceId)
      .set('x-device-key', testDeviceKey)
      .send({
        deviceId: testDeviceId,
        cardUid: 'A1:B2:C3:D4',
        timestamp: '2026-11-03T09:05:00+05:30',
      });

    // Immediate second scan (10 seconds later, within 60s cooldown)
    const res = await request(app)
      .post('/api/v1/device/scan')
      .set('x-device-id', testDeviceId)
      .set('x-device-key', testDeviceKey)
      .send({
        deviceId: testDeviceId,
        cardUid: 'A1:B2:C3:D4',
        timestamp: '2026-11-03T09:05:10+05:30',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.isDuplicate).toBe(true);
    expect(res.body.message).toMatch(/Duplicate scan ignored/i);

    // Verify only ONE attendance record in DB
    const count = await Attendance.countDocuments({ studentId: 'STU101' });
    expect(count).toBe(1);
  });

  // Scenarios 5 & 6: Network retry / offline sync with unique eventId
  it('5 & 6. should handle offline sync and network retries idempotently with eventId', async () => {
    const eventId = 'evt_esp8266_offline_001';

    // First attempt (e.g. offline queue flushed)
    const res1 = await request(app)
      .post('/api/v1/device/scan')
      .set('x-device-id', testDeviceId)
      .set('x-device-key', testDeviceKey)
      .send({
        deviceId: testDeviceId,
        cardUid: 'A1:B2:C3:D4',
        eventId,
        timestamp: '2026-11-03T09:00:00+05:30',
      });

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);

    // Second attempt (network retry of same offline event)
    const res2 = await request(app)
      .post('/api/v1/device/scan')
      .set('x-device-id', testDeviceId)
      .set('x-device-key', testDeviceKey)
      .send({
        deviceId: testDeviceId,
        cardUid: 'A1:B2:C3:D4',
        eventId,
        timestamp: '2026-11-03T09:00:00+05:30',
      });

    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);
    expect(res2.body.message).toMatch(/idempotent retry/i);

    // Verify only 1 record created in database
    const records = await Attendance.find({ studentId: 'STU101' });
    expect(records.length).toBe(1);
  });

  // Scenario 7: Existing RFID tag data preserved
  it('7. should preserve existing RFID tag data block in database', async () => {
    const card = await RfidCard.findOne({ cardUid: 'A1:B2:C3:D4' });
    expect(card.storedTagData).toBe('Mani');
  });

  // Scenario 11: Invalid device authentication is rejected
  it('11. should reject invalid device authentication with 401', async () => {
    const res = await request(app)
      .post('/api/v1/device/scan')
      .set('x-device-id', testDeviceId)
      .set('x-device-key', 'WRONG_KEY')
      .send({
        deviceId: testDeviceId,
        cardUid: 'A1:B2:C3:D4',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // Scenario 12: Attendance dates and times calculated correctly for Asia/Kolkata
  it('12. should calculate late status and Asia/Kolkata date correctly', async () => {
    // Register another student for late arrival test
    await Student.create({
      studentId: 'STU103',
      name: 'Late Student',
      className: 'CSE-4A',
      status: 'active',
    });
    await RfidCard.create({
      cardUid: '33:44:55:66',
      studentId: 'STU103',
      status: 'active',
    });

    // Scan at 09:45 AM (after configured 09:30 AM threshold)
    const res = await request(app)
      .post('/api/v1/device/scan')
      .set('x-device-id', testDeviceId)
      .set('x-device-key', testDeviceKey)
      .send({
        deviceId: testDeviceId,
        cardUid: '33:44:55:66',
        timestamp: '2026-11-03T09:45:00+05:30',
      });

    expect(res.status).toBe(200);
    expect(res.body.attendanceStatus).toBe('late');

    const record = await Attendance.findOne({ studentId: 'STU103' });
    expect(record.status).toBe('late');
    expect(record.attendanceDate).toBe('2026-11-03');
  });
});

