const jwt = require('jsonwebtoken');
const config = require('../config');
const { errorResponse } = require('../utils/response');

/**
 * Middleware to authenticate administrative requests.
 * Supports:
 *  1. JWT Bearer token in 'Authorization: Bearer <token>'
 *  2. API Key in 'x-admin-key' header or 'Authorization: Bearer <apiKey>'
 */
const requireAdminAuth = (req, res, next) => {
  const headerKey = req.headers['x-admin-key'];
  const authHeader = req.headers['authorization'];

  // Direct API Key via custom header
  if (headerKey && headerKey === config.adminApiKey) {
    req.user = { username: config.adminUsername, role: 'admin' };
    return next();
  }

  // Authorization header check
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (token) {
    // If bearer token matches admin API key directly
    if (token === config.adminApiKey) {
      req.user = { username: config.adminUsername, role: 'admin' };
      return next();
    }

    // Verify JWT
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      req.user = decoded;
      return next();
    } catch (err) {
      return errorResponse(res, 'Unauthorized: Invalid or expired token', 401);
    }
  }

  return errorResponse(res, 'Unauthorized: Invalid or missing administrative credentials', 401);
};

const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized: Authentication required', 401);
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return errorResponse(res, 'Forbidden: Insufficient privileges', 403);
    }
    next();
  };
};

module.exports = {
  requireAdminAuth,
  authenticate: requireAdminAuth,
  authorize,
};
