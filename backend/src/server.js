const app = require('./app');
const config = require('./config');
const { connectDB, disconnectDB } = require('./config/db');

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(`  RFID Attendance Backend API Server Running        `);
      console.log(`  Port:      ${config.port}                         `);
      console.log(`  Env:       ${config.env}                          `);
      console.log(`  Timezone:  ${config.timezone}                     `);
      console.log(`  Health:    http://localhost:${config.port}/api/v1/health`);
      console.log(`====================================================`);
    });

    const gracefulShutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        console.log('HTTP server closed. Exiting process.');
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

module.exports = { startServer };

