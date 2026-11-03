const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const { requireAdminAuth } = require('../middlewares/auth');

router.use(requireAdminAuth);

router.post('/register', cardController.registerCard);
router.get('/', cardController.getCards);
router.get('/:uid', cardController.getCardByUid);
router.put('/:uid/block', cardController.blockCard);
router.put('/:uid/activate', cardController.activateCard);

module.exports = router;

