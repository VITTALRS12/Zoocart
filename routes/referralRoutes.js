const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/info/:userId', authMiddleware.authenticate, referralController.getReferralInfo);
router.post('/apply', authMiddleware.authenticate, referralController.applyReferral);

module.exports = router;