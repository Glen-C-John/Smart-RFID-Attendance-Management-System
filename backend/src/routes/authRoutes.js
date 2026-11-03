const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAdminAuth } = require('../middlewares/auth');

router.post('/login', authController.login);
router.get('/me', requireAdminAuth, authController.getMe);
router.post('/logout', requireAdminAuth, authController.logout);

module.exports = router;

