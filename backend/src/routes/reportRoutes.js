const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate, authorize(['admin']));

// Standard Phase 2 Report endpoint
router.get('/', reportController.generateReport);

// Phase 3 Advanced Report Builder endpoints
router.post('/generate', reportController.buildReport);
router.get('/history', reportController.getHistory);
router.get('/:id/download', reportController.downloadReport);

module.exports = router;
