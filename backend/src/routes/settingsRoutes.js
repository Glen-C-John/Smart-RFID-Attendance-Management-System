const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { requireAdminAuth } = require('../middlewares/auth');

router.use(requireAdminAuth);

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);

module.exports = router;

