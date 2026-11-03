const config = require('../config');
const { errorResponse } = require('../utils/response');

/**
 * Middleware to authenticate administrative requests.
 * Expects 'x-admin-key' header or 'Authorization: Bearer <key>'.
 */
const requireAdminAuth = (req, res, next) => {
  const headerKey = req.headers['x-admin-key'];
  const authHeader = req.headers['authorization'];
  
  let bearerKey = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    bearerKey = authHeader.substring(7).trim();
  }

  const providedKey = headerKey || bearerKey;

  if (!providedKey || providedKey !== config.adminApiKey) {
    return errorResponse(res, 'Unauthorized: Invalid or missing administrative API key', 401);
  }

  next();
};

module.exports = {
  requireAdminAuth,
};

