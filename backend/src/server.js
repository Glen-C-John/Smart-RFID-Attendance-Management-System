const http = require('http');
const { Server } = require('socket.io');
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

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Admin client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

const startServer = async () => {
  try {
    await connectDB();

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
