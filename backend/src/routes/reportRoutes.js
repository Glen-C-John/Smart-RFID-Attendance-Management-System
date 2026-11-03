const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { requireAdminAuth } = require('../middlewares/auth');

router.use(requireAdminAuth);

router.get('/', reportController.generateReport);

module.exports = router;

