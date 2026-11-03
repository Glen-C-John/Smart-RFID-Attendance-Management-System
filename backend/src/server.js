const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const app = require('./app');
const config = require('./config');
const { connectDB, disconnectDB } = require('./config/db');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

app.set('io', io);

// Enforce authentication for real-time WebSocket stream
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return next(new Error('Authentication error: Missing token'));
  }

  if (token === config.adminApiKey) {
    socket.user = { username: config.adminUsername, role: 'admin' };
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    socket.user = decoded;
    return next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Authenticated admin client connected: ${socket.id} (${socket.user?.username || 'admin'})`);
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

const startServer = async () => {
  try {
    await connectDB();

    // Hydrate runtime config from persisted MongoDB settings if available
    const Setting = require('./models/Setting');
    const saved = await Setting.findOne();
    if (saved) {
      if (saved.workDayStartTime) config.attendance.workDayStartTime = saved.workDayStartTime;
      if (saved.lateThresholdTime) config.attendance.lateThresholdTime = saved.lateThresholdTime;
      if (saved.cooldownSeconds) config.attendance.cooldownSeconds = saved.cooldownSeconds;
      if (saved.checkoutMinIntervalMinutes) config.attendance.checkoutMinIntervalMinutes = saved.checkoutMinIntervalMinutes;
      if (saved.enableCheckout !== undefined) config.attendance.enableCheckout = saved.enableCheckout;
      if (saved.timezone) config.timezone = saved.timezone;
      if (saved.deviceHeartbeatThresholdSeconds) config.deviceHeartbeatThresholdSeconds = saved.deviceHeartbeatThresholdSeconds;
      console.log(`[Config] Loaded persisted institution settings (${saved.institutionName})`);
    }

    server.listen(config.port, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(`  RFID Attendance Backend API & Socket Server       `);
      console.log(`  Port:      ${config.port}                         `);
      console.log(`  Env:       ${config.env}                          `);
      console.log(`  Timezone:  ${config.timezone}                     `);
      console.log(`  Health:    http://localhost:${config.port}/api/v1/health`);
      console.log(`====================================================`);
    });

    const gracefulShutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      io.close();
      server.close(async () => {
        await disconnectDB();
        console.log('HTTP & Socket.IO server closed. Exiting process.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { startServer, server, io };
