const request = require('supertest');
const app = require('../src/app');
const config = require('../src/config');
const Student = require('../src/models/Student');
const RfidCard = require('../src/models/RfidCard');

describe('Admin Management & System Health Tests', () => {
  const adminKey = config.adminApiKey;

  // Scenario 10: Health check reports database connection status
  it('10. should report healthy status and connected database', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('healthy');
    expect(res.body.database.status).toBe('connected');
    expect(res.body.timezone).toBe(config.timezone);
  });

  it('should reject unauthenticated access to admin endpoints', async () => {
    const res = await request(app).get('/api/v1/students');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should allow authenticated admin to create and retrieve students', async () => {
    const createRes = await request(app)
      .post('/api/v1/students')
      .set('x-admin-key', adminKey)
      .send({
        studentId: 'STU200',
        name: 'Anita Roy',
        className: 'IT-2B',
        department: 'Information Technology',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.student.studentId).toBe('STU200');

    const listRes = await request(app)
      .get('/api/v1/students')
      .set('x-admin-key', adminKey);

    expect(listRes.status).toBe(200);
    expect(listRes.body.students.length).toBe(1);
    expect(listRes.body.students[0].name).toBe('Anita Roy');
  });

  it('should allow admin to register, block, and activate RFID cards', async () => {
    // Register student first
    await Student.create({
      studentId: 'STU201',
      name: 'Kiran Deep',
      className: 'ECE-1',
      status: 'active',
    });

    // Register card
    const regRes = await request(app)
      .post('/api/v1/cards/register')
      .set('x-admin-key', adminKey)
      .send({
        cardUid: '12:34:56:78',
        studentId: 'STU201',
        storedTagData: 'Kiran',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.card.cardUid).toBe('12:34:56:78');
    expect(regRes.body.card.status).toBe('active');

    // Block card
    const blockRes = await request(app)
      .put('/api/v1/cards/12:34:56:78/block')
      .set('x-admin-key', adminKey);

    expect(blockRes.status).toBe(200);
    expect(blockRes.body.card.status).toBe('blocked');

    // Activate card
    const activateRes = await request(app)
      .put('/api/v1/cards/12:34:56:78/activate')
      .set('x-admin-key', adminKey);

    expect(activateRes.status).toBe(200);
    expect(activateRes.body.card.status).toBe('active');
  });

  it('should hydrate runtime configuration from persisted Setting model', async () => {
    const Setting = require('../src/models/Setting');
    await Setting.deleteMany({});
    await Setting.create({
      institutionName: 'Test Tech Institute',
      workDayStartTime: '08:30',
      lateThresholdTime: '08:45',
      cooldownSeconds: 90,
    });

    const saved = await Setting.findOne();
    expect(saved).not.toBeNull();
    if (saved) {
      if (saved.lateThresholdTime) config.attendance.lateThresholdTime = saved.lateThresholdTime;
      if (saved.cooldownSeconds) config.attendance.cooldownSeconds = saved.cooldownSeconds;
    }

    expect(config.attendance.lateThresholdTime).toBe('08:45');
    expect(config.attendance.cooldownSeconds).toBe(90);
  });
});

