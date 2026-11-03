const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { requireAdminAuth } = require('../middlewares/auth');

router.use(requireAdminAuth);

router.get('/', attendanceController.getAttendance);
router.get('/:id', attendanceController.getAttendanceById);
router.get('/student/:studentId', attendanceController.getAttendanceByStudent);
router.get('/date/:date', attendanceController.getAttendanceByDate);

module.exports = router;

