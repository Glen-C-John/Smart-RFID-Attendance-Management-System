const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middlewares/auth');

// Protect all analytics endpoints with admin authentication
router.use(authenticate, authorize(['admin']));

router.get('/overview', analyticsController.getOverview);
router.get('/trends', analyticsController.getTrends);
router.get('/student/:studentId', analyticsController.getStudentAnalytics);
router.get('/classes', analyticsController.getClassesAnalytics);
router.get('/heatmap', analyticsController.getHeatmap);
router.get('/punctuality', analyticsController.getPunctuality);
router.get('/risk', analyticsController.getRiskOverview);
router.get('/data-quality', analyticsController.getDataQuality);

module.exports = router;
