const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { io: Client } = require('../../frontend/node_modules/socket.io-client');
const config = require('../src/config');

describe('Socket.IO Authentication Middleware Tests', () => {
  let server;
  let io;
  let port;

  beforeAll((done) => {
    server = http.createServer();
    io = new Server(server, { cors: { origin: '*' } });

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

    server.listen(0, () => {
      port = server.address().port;
      done();
    });
  });

  afterAll((done) => {
    io.close();
    server.close(done);
  });

  it('should reject connection when no auth token is provided', (done) => {
    const socket = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('connect_error', (err) => {
      expect(err.message).toBe('Authentication error: Missing token');
      socket.disconnect();
      done();
    });
  });

  it('should reject connection with invalid token', (done) => {
    const socket = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth: { token: 'invalid_bad_token_123' },
      autoConnect: true,
    });

    socket.on('connect_error', (err) => {
      expect(err.message).toBe('Authentication error: Invalid or expired token');
      socket.disconnect();
      done();
    });
  });

  it('should accept connection with valid JWT token', (done) => {
    const validToken = jwt.sign(
      { username: config.adminUsername, role: 'admin' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    const socket = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth: { token: validToken },
      autoConnect: true,
    });

    socket.on('connect', () => {
      expect(socket.connected).toBe(true);
      socket.disconnect();
      done();
    });

    socket.on('connect_error', (err) => {
      done(err);
    });
  });

  it('should accept connection with admin API key in auth', (done) => {
    const socket = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth: { token: config.adminApiKey },
      autoConnect: true,
    });

    socket.on('connect', () => {
      expect(socket.connected).toBe(true);
      socket.disconnect();
      done();
    });

    socket.on('connect_error', (err) => {
      done(err);
    });
  });
});

