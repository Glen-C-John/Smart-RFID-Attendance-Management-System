const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate, authorize(['admin']));

router.get('/', calendarController.getCalendar);
router.put('/', calendarController.updateCalendar);
router.post('/holiday', calendarController.addHoliday);
router.delete('/holiday/:id', calendarController.removeHoliday);
router.post('/semester', calendarController.addSemester);
router.delete('/semester/:id', calendarController.removeSemester);
router.get('/working-days', calendarController.getWorkingDays);

module.exports = router;
