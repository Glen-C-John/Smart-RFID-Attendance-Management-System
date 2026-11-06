const express = require('express');
const router = express.Router();
const reportScheduleController = require('../controllers/reportScheduleController');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate, authorize(['admin']));

router.get('/', reportScheduleController.getSchedules);
router.post('/', reportScheduleController.createSchedule);
router.put('/:id', reportScheduleController.updateSchedule);
router.delete('/:id', reportScheduleController.deleteSchedule);
router.post('/:id/run-now', reportScheduleController.runScheduleNow);

module.exports = router;
