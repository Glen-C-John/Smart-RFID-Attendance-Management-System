const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate, authorize(['admin']));

router.get('/', auditLogController.getAuditLogs);

module.exports = router;
