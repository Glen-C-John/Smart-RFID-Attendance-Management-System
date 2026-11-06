const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const config = require('../config');
const { nowInTimezone } = require('../utils/timezone');

const authRoutes = require('./authRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const scanRoutes = require('./scanRoutes');
const studentRoutes = require('./studentRoutes');
const cardRoutes = require('./cardRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const deviceRoutes = require('./deviceRoutes');
const reportRoutes = require('./reportRoutes');
const settingsRoutes = require('./settingsRoutes');

// Phase 3 Intelligence & Reporting Routes
const analyticsRoutes = require('./analyticsRoutes');
const alertRoutes = require('./alertRoutes');
const calendarRoutes = require('./calendarRoutes');
const reportScheduleRoutes = require('./reportScheduleRoutes');
const auditLogRoutes = require('./auditLogRoutes');

// Health Check Endpoint
router.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const now = nowInTimezone();

  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: now.toISO(),
    timezone: config.timezone,
    database: {
      status: dbStatus,
      name: mongoose.connection.name || null,
    },
    uptimeSeconds: Math.floor(process.uptime()),
    version: '3.0.0',
  });
});

// Standard API Routes
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/device', scanRoutes);
router.use('/students', studentRoutes);
router.use('/cards', cardRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/devices', deviceRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);

// Phase 3 Extended Routes
router.use('/analytics', analyticsRoutes);
router.use('/alerts', alertRoutes);
router.use('/calendar', calendarRoutes);
router.use('/report-schedules', reportScheduleRoutes);
router.use('/audit-logs', auditLogRoutes);

module.exports = router;
