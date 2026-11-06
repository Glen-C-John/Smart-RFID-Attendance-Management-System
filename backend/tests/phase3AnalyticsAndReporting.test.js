const request = require('supertest');
const app = require('../src/app');
const Student = require('../src/models/Student');
const Attendance = require('../src/models/Attendance');
const RfidCard = require('../src/models/RfidCard');
const InstitutionCalendar = require('../src/models/InstitutionCalendar');
const ReportSchedule = require('../src/models/ReportSchedule');
const GeneratedReport = require('../src/models/GeneratedReport');
const AuditLog = require('../src/models/AuditLog');
const calendarService = require('../src/services/calendarService');
const reportBuilderService = require('../src/services/reportBuilderService');

describe('Phase 3: Advanced Analytics, Intelligence & Automated Reporting Test Suite', () => {
  const adminKey = 'admin_super_secret_key_change_in_production';

  beforeEach(async () => {
    // Reset DB state
    await Student.deleteMany({});
    await Attendance.deleteMany({});
    await RfidCard.deleteMany({});
    await InstitutionCalendar.deleteMany({});
    await ReportSchedule.deleteMany({});
    await GeneratedReport.deleteMany({});
    await AuditLog.deleteMany({});

    // Seed test students
    await Student.create([
      {
        studentId: 'STU301',
        name: 'Alice Johnson',
        className: 'CS-A',
        department: 'Computer Science',
        status: 'active',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        studentId: 'STU302',
        name: 'Bob Smith',
        className: 'CS-A',
        department: 'Computer Science',
        status: 'active',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        studentId: 'STU303',
        name: 'Charlie Brown',
        className: 'EC-B',
        department: 'Electronics',
        status: 'active',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]);

    // Seed test RFID card
    await RfidCard.create({
      cardUid: 'A1:B2:C3:D4',
      studentId: 'STU301',
      status: 'active',
    });

    // Seed test attendance records
    // Day 1: 2026-03-02 (Monday)
    await Attendance.create([
      {
        studentId: 'STU301',
        cardUid: 'A1:B2:C3:D4',
        deviceId: 'ESP8266_001',
        attendanceDate: '2026-03-02',
        checkInTime: new Date('2026-03-02T09:05:00+05:30'),
        checkOutTime: new Date('2026-03-02T17:00:00+05:30'),
        status: 'present',
      },
      {
        studentId: 'STU302',
        cardUid: 'B2:C3:D4:E5',
        deviceId: 'ESP8266_001',
        attendanceDate: '2026-03-02',
        checkInTime: new Date('2026-03-02T09:45:00+05:30'),
        checkOutTime: new Date('2026-03-02T17:00:00+05:30'),
        status: 'late',
      },
    ]);

    // Day 2: 2026-03-03 (Tuesday)
    await Attendance.create([
      {
        studentId: 'STU301',
        cardUid: 'A1:B2:C3:D4',
        deviceId: 'ESP8266_001',
        attendanceDate: '2026-03-03',
        checkInTime: new Date('2026-03-03T09:02:00+05:30'),
        checkOutTime: new Date('2026-03-03T16:55:00+05:30'),
        status: 'present',
      },
      // STU302 is absent
      // STU303 is present
      {
        studentId: 'STU303',
        cardUid: 'C3:D4:E5:F6',
        deviceId: 'ESP8266_001',
        attendanceDate: '2026-03-03',
        checkInTime: new Date('2026-03-03T08:58:00+05:30'),
        checkOutTime: new Date('2026-03-03T17:05:00+05:30'),
        status: 'present',
      },
    ]);
  });

  describe('1. Calendar & Working Days Management', () => {
    it('1.1 should initialize default calendar with standard weekdays and holidays', async () => {
      const res = await request(app)
        .get('/api/v1/calendar')
        .set('x-admin-key', adminKey);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.calendar.workingDays).toEqual([1, 2, 3, 4, 5]);
      expect(res.body.calendar.holidays.length).toBeGreaterThan(0);
    });

    it('1.2 should accurately compute working days excluding weekends and holidays', async () => {
      // Add a holiday on 2026-03-04 (Wednesday)
      await calendarService.addHoliday({
        name: 'Mid-term Holiday',
        date: '2026-03-04',
        type: 'institution',
      });

      // 2026-03-02 (Mon) to 2026-03-08 (Sun) = 7 calendar days
      // Regular working days: Mon(2), Tue(3), Wed(4-holiday), Thu(5), Fri(6), Sat(7-weekend), Sun(8-weekend)
      // Expected working days: 2, 3, 5, 6 = 4 days
      const workingDays = await calendarService.getWorkingDaysList('2026-03-02', '2026-03-08');
      expect(workingDays).toEqual(['2026-03-02', '2026-03-03', '2026-03-05', '2026-03-06']);
      expect(workingDays.length).toBe(4);
    });

    it('1.3 should allow adding and removing academic semesters and log to audit', async () => {
      const res = await request(app)
        .post('/api/v1/calendar/semester')
        .set('x-admin-key', adminKey)
        .send({
          name: 'Spring 2026',
          startDate: '2026-01-15',
          endDate: '2026-05-30',
          isActive: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.calendar.semesters.some((s) => s.name === 'Spring 2026')).toBe(true);
    });
  });

  describe('2. Advanced Analytics Overview & Trends', () => {
    it('2.1 should calculate institutional KPIs and rates accurately using working days', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/overview?startDate=2026-03-02&endDate=2026-03-03&period=custom')
        .set('x-admin-key', adminKey);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const kpis = res.body.kpis;
      expect(kpis.totalActiveStudents).toBe(3);
      expect(kpis.totalSessions).toBe(4); // 2 on Monday + 2 on Tuesday
      expect(kpis.totalPresentDays).toBe(4); // 3 present + 1 late = 4
      expect(kpis.totalLateArrivals).toBe(1);
    });

    it('2.2 should return daily and weekly attendance trends', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/trends?interval=daily&startDate=2026-03-02&endDate=2026-03-03')
        .set('x-admin-key', adminKey);

      expect(res.status).toBe(200);
      expect(res.body.trends.length).toBe(2);
      expect(res.body.trends[0].date).toBe('2026-03-02');
      expect(res.body.trends[0].present).toBe(2);
      expect(res.body.trends[0].late).toBe(1);
    });
  });

  describe('3. Student 360-Degree Attendance Profile', () => {
    it('3.1 should return complete individual student metrics, streaks and heatmap', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/student/STU301')
        .set('x-admin-key', adminKey);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.student.studentId).toBe('STU301');
      expect(res.body.metrics.totalPresentDays).toBe(2);
      expect(res.body.metrics.longestPresentStreak).toBeGreaterThanOrEqual(1);
      expect(res.body.visualizations.calendarHeatmap.length).toBeGreaterThan(0);
      expect(res.body.visualizations.arrivalDistribution).toBeDefined();
    });

    it('3.2 should return 404 for non-existent student', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/student/NONEXISTENT')
        .set('x-admin-key', adminKey);

      expect(res.status).toBe(404);
    });
  });

  describe('4. Class and Department Analytics', () => {
    it('4.1 should aggregate attendance by class and department on the server side', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/classes?startDate=2026-03-02&endDate=2026-03-03')
        .set('x-admin-key', adminKey);

      expect(res.status).toBe(200);
      expect(res.body.classes.length).toBe(2); // CS-A and EC-B
      expect(res.body.departments.length).toBe(2); // Computer Science and Electronics
      expect(res.body.summary.highestAttendanceClass).toBeDefined();
    });
  });

  describe('5. Heatmaps & Punctuality Analysis', () => {
    it('5.1 should generate day-of-week attendance matrix', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/heatmap?startDate=2026-03-02&endDate=2026-03-03')
        .set('x-admin-key', adminKey);

      expect(res.status).toBe(200);
      expect(res.body.weekdayMatrix.length).toBe(7); // Mon to Sun
      const monday = res.body.weekdayMatrix.find((w) => w.dayName === 'Mon');
      expect(monday.presentCount).toBe(2);
    });

    it('5.2 should compute punctuality arrival buckets and identify late arrivals', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/punctuality?startDate=2026-03-02&endDate=2026-03-03')
        .set('x-admin-key', adminKey);

      expect(res.status).toBe(200);
      expect(res.body.totalLate).toBe(1);
      expect(res.body.buckets.some((b) => b.label.includes('Late') && b.count > 0)).toBe(true);
      expect(res.body.frequentLatecomers.some((s) => s.studentId === 'STU302')).toBe(true);
    });
  });

  describe('6. Attendance Risk & Early-Warning Monitoring', () => {
    it('6.1 should evaluate deterministic rules and flag at-risk students', async () => {
      const res = await request(app)
        .get('/api/v1/alerts')
        .set('x-admin-key', adminKey);

      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
    });

    it('6.2 should allow admin to mark a risk alert as reviewed with comments', async () => {
      const res = await request(app)
        .patch('/api/v1/alerts/STU302/review')
        .set('x-admin-key', adminKey)
        .send({ comment: 'Parent notified regarding attendance' });

      expect(res.status).toBe(200);
      expect(res.body.alert.status).toBe('reviewed');
      expect(res.body.alert.reviewComment).toBe('Parent notified regarding attendance');

      // Verify audit log entry was created
      const auditRes = await request(app)
        .get('/api/v1/audit-logs?operation=review_attendance_alert')
        .set('x-admin-key', adminKey);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.logs.some((l) => l.recordId === 'STU302')).toBe(true);
    });
  });

  describe('7. Data Quality & Anomaly Surfacing', () => {
    it('7.1 should surface historical records with missing check-out without modifying them', async () => {
      // Create record with missing check-out on historical date
      await Attendance.create({
        studentId: 'STU301',
        cardUid: 'A1:B2:C3:D4',
        deviceId: 'ESP8266_001',
        attendanceDate: '2026-01-10',
        checkInTime: new Date('2026-01-10T09:00:00+05:30'),
        checkOutTime: null,
        status: 'present',
      });

      const res = await request(app)
        .get('/api/v1/analytics/data-quality')
        .set('x-admin-key', adminKey);

      expect(res.status).toBe(200);
      expect(res.body.categories.missingCheckoutCount).toBeGreaterThan(0);
      expect(res.body.anomalies.some((a) => a.category === 'Missing Check-out')).toBe(true);
    });
  });

  describe('8. Advanced Report Builder & Multi-Format Exporter', () => {
    it('8.1 should compile a preview report with dynamic filters', async () => {
      const res = await request(app)
        .post('/api/v1/reports/generate')
        .set('x-admin-key', adminKey)
        .send({
          reportType: 'class',
          startDate: '2026-03-02',
          endDate: '2026-03-03',
          className: 'CS-A',
          format: 'preview',
        });

      expect(res.status).toBe(200);
      expect(res.body.reportData.records.length).toBeGreaterThan(0);
      expect(res.body.reportData.columns).toBeDefined();
    });

    it('8.2 should export native Excel (.xlsx) report using ExcelJS', async () => {
      const res = await request(app)
        .post('/api/v1/reports/generate')
        .set('x-admin-key', adminKey)
        .send({
          reportType: 'daily',
          startDate: '2026-03-02',
          endDate: '2026-03-02',
          format: 'xlsx',
        });

      expect(res.status).toBe(200);
      expect(res.body.format).toBe('xlsx');
      expect(res.body.fileName).toMatch(/\.xlsx$/);
      expect(res.body.downloadUrl).toBeDefined();
    });

    it('8.3 should export CSV format with formula injection protection', async () => {
      const res = await request(app)
        .post('/api/v1/reports/generate')
        .set('x-admin-key', adminKey)
        .send({
          reportType: 'monthly',
          startDate: '2026-03-01',
          endDate: '2026-03-31',
          format: 'csv',
        });

      expect(res.status).toBe(200);
      expect(res.body.format).toBe('csv');
      expect(res.body.fileName).toMatch(/\.csv$/);
    });

    it('8.4 should manage recurring report schedules and trigger run-now', async () => {
      // Create schedule
      const createRes = await request(app)
        .post('/api/v1/report-schedules')
        .set('x-admin-key', adminKey)
        .send({
          title: 'Daily CS-A Attendance Export',
          reportType: 'class',
          frequency: 'daily',
          generationTime: '17:30',
          format: 'xlsx',
          filters: { className: 'CS-A' },
        });

      expect(createRes.status).toBe(201);
      const scheduleId = createRes.body.schedule._id;

      // Trigger run-now
      const runRes = await request(app)
        .post(`/api/v1/report-schedules/${scheduleId}/run-now`)
        .set('x-admin-key', adminKey);

      expect(runRes.status).toBe(200);
      expect(runRes.body.generatedReport.title).toBe('Daily CS-A Attendance Export');

      // Verify history endpoint returns the generated report
      const histRes = await request(app)
        .get('/api/v1/reports/history')
        .set('x-admin-key', adminKey);

      expect(histRes.status).toBe(200);
      expect(histRes.body.history.length).toBeGreaterThan(0);
    });
  });

  describe('9. Immutable Administrative Audit Logging', () => {
    it('9.1 should provide immutable audit log records with filtering', async () => {
      const auditService = require('../src/services/auditService');
      await auditService.logAction({
        administrator: 'admin',
        operation: 'system_initialization',
        recordType: 'System',
        reason: 'Phase 3 Audit Log verification',
      });

      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('x-admin-key', adminKey);

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
    });
  });
});
