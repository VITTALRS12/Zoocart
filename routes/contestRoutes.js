const express = require('express');
const router = express.Router();
const contestController = require('../controllers/contestController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/leaderboard', contestController.getLeaderboard);
router.post('/score', authMiddleware.authenticate, contestController.saveContestScore);
router.get('/stats/:playerId', authMiddleware.authenticate, contestController.getUserStats);

module.exports = router;