const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authenticate } = require('../middleware/auth');

// Only allow authenticated users
router.get('/:userId', authenticate, walletController.getWallet);
router.post('/add-money', authenticate, walletController.addMoney);
router.post('/verify-payment', authenticate, walletController.verifyPayment);
router.post('/make-payment', authenticate, walletController.makePayment);

module.exports = router;
