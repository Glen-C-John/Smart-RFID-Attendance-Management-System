const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireAdminAuth } = require('../middlewares/auth');

router.use(requireAdminAuth);

router.get('/overview', dashboardController.getOverview);
router.get('/trends', dashboardController.getTrends);
router.get('/distribution', dashboardController.getDistribution);
router.get('/class-comparison', dashboardController.getClassComparison);
router.get('/recent-activity', dashboardController.getRecentActivity);

module.exports = router;

