const request = require('supertest');
const app = require('../src/app');
const config = require('../src/config');
const Student = require('../src/models/Student');
const RfidCard = require('../src/models/RfidCard');
const Attendance = require('../src/models/Attendance');
const Device = require('../src/models/Device');
const { getAttendanceDateString } = require('../src/utils/timezone');

describe('Phase 2 Backend Features & API Endpoints', () => {
  let authToken;

  beforeEach(async () => {
    // 1. Login to get JWT
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: config.adminUsername,
        password: config.adminPassword,
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    authToken = loginRes.body.token;

    // 2. Setup Device
    await Device.create({
      deviceId: 'ESP8266_DEV1',
      deviceName: 'Gate Scanner 1',
      location: 'Block A',
      apiKey: 'key_123',
      status: 'active',
      lastSeen: new Date(),
    });

    // 3. Setup Students
    await Student.create([
      { studentId: 'STU501', name: 'Aarav Patel', className: 'CSE-1', status: 'active' },
      { studentId: 'STU502', name: 'Diya Sharma', className: 'CSE-1', status: 'active' },
      { studentId: 'STU503', name: 'Ishaan Verma', className: 'ECE-2', status: 'active' },
    ]);

    // 4. Setup Cards
    await RfidCard.create([
      { cardUid: '10:20:30:40', studentId: 'STU501', storedTagData: 'Aarav', status: 'active' },
      { cardUid: '50:60:70:80', studentId: 'STU502', storedTagData: 'Diya', status: 'active' },
    ]);

    // 5. Setup Attendance for today
    const today = getAttendanceDateString();
    await Attendance.create([
      {
        studentId: 'STU501',
        cardUid: '10:20:30:40',
        deviceId: 'ESP8266_DEV1',
        attendanceDate: today,
        checkInTime: new Date(),
        status: 'present',
      },
      {
        studentId: 'STU502',
        cardUid: '50:60:70:80',
        deviceId: 'ESP8266_DEV1',
        attendanceDate: today,
        checkInTime: new Date(),
        status: 'late',
      },
    ]);
  });

  it('should authenticate admin and reject invalid credentials', async () => {
    const badLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });
    expect(badLogin.status).toBe(401);

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.username).toBe(config.adminUsername);
  });

  it('should return live dashboard overview statistics', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/overview')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.overview.totalActiveStudents).toBe(3);
    expect(res.body.overview.presentToday).toBe(2);
    expect(res.body.overview.absentToday).toBe(1);
    expect(res.body.overview.lateToday).toBe(1);
    expect(res.body.overview.totalDevices).toBe(1);
    expect(res.body.overview.onlineDevices).toBe(1);
  });

  it('should return dashboard trends, distribution, and class comparisons', async () => {
    const trendsRes = await request(app)
      .get('/api/v1/dashboard/trends?days=7')
      .set('Authorization', `Bearer ${authToken}`);
    expect(trendsRes.status).toBe(200);
    expect(trendsRes.body.trends.length).toBe(7);

    const distRes = await request(app)
      .get('/api/v1/dashboard/distribution')
      .set('Authorization', `Bearer ${authToken}`);
    expect(distRes.status).toBe(200);
    expect(distRes.body.distribution.length).toBe(3);

    const classRes = await request(app)
      .get('/api/v1/dashboard/class-comparison')
      .set('Authorization', `Bearer ${authToken}`);
    expect(classRes.status).toBe(200);
    expect(classRes.body.comparison.length).toBeGreaterThan(0);
  });

  it('should allow manual attendance correction and maintain audit trail', async () => {
    const record = await Attendance.findOne({ studentId: 'STU501' });

    // Try correction without reason -> must fail 400
    const failRes = await request(app)
      .patch(`/api/v1/attendance/${record._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'late' });
    expect(failRes.status).toBe(400);

    // Valid correction with reason
    const correctRes = await request(app)
      .patch(`/api/v1/attendance/${record._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: 'late',
        reason: 'Student bus arrived 15 minutes late due to traffic',
      });

    expect(correctRes.status).toBe(200);
    expect(correctRes.body.attendance.status).toBe('late');
    expect(correctRes.body.attendance.auditLog.length).toBe(1);
    expect(correctRes.body.attendance.auditLog[0].reason).toContain('bus arrived');
    expect(correctRes.body.attendance.auditLog[0].previousValues.status).toBe('present');
  });

  it('should generate attendance reports by date range and type', async () => {
    const today = getAttendanceDateString();
    const res = await request(app)
      .get(`/api/v1/reports?type=daily&date=${today}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.summary.totalSessions).toBe(2);
    expect(res.body.records.length).toBe(2);
  });

  it('should get and update system settings', async () => {
    const getRes = await request(app)
      .get('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.settings.institutionName).toBeDefined();

    const putRes = await request(app)
      .put('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        institutionName: 'Apex Engineering Academy',
        lateThresholdTime: '09:15',
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body.settings.institutionName).toBe('Apex Engineering Academy');
    expect(putRes.body.settings.lateThresholdTime).toBe('09:15');
  });
});

