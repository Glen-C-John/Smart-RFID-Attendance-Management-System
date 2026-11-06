const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate, authorize(['admin']));

router.get('/', alertController.getAlerts);
router.patch('/:id/review', alertController.reviewAlert);

module.exports = router;
