const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const config = require('../config');
const { nowInTimezone } = require('../utils/timezone');

const scanRoutes = require('./scanRoutes');
const studentRoutes = require('./studentRoutes');
const cardRoutes = require('./cardRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const deviceRoutes = require('./deviceRoutes');

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
    version: '1.0.0',
  });
});

// API Routes
router.use('/device', scanRoutes);
router.use('/students', studentRoutes);
router.use('/cards', cardRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/devices', deviceRoutes);

module.exports = router;

