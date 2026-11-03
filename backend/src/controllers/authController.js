const jwt = require('jsonwebtoken');
const config = require('../config');
const { successResponse, errorResponse } = require('../utils/response');

const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return errorResponse(res, 'Username and password are required', 400);
  }

  // Validate admin credentials
  if (username !== config.adminUsername || password !== config.adminPassword) {
    return errorResponse(res, 'Invalid admin username or password', 401);
  }

  const token = jwt.sign(
    {
      username: config.adminUsername,
      role: 'admin',
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  return successResponse(
    res,
    {
      token,
      user: {
        username: config.adminUsername,
        role: 'admin',
        name: 'System Administrator',
      },
    },
    'Login successful'
  );
};

const getMe = async (req, res) => {
  return successResponse(res, {
    user: {
      username: req.user.username || config.adminUsername,
      role: req.user.role || 'admin',
      name: 'System Administrator',
    },
  });
};

const logout = async (req, res) => {
  return successResponse(res, {}, 'Logged out successfully');
};

module.exports = {
  login,
  getMe,
  logout,
};

