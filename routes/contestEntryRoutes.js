const express = require('express');
const router = express.Router();
const entryController = require('../controllers/contestEntryController');
const { authenticate, isAdmin } = require('../middlewares/authMiddleware');

// User routes
router.post('/', authenticate, entryController.submitEntry);
router.get('/my', authenticate, entryController.getMyEntries);

// Admin routes
router.get('/contest/:contestId', authenticate, isAdmin, entryController.getContestEntries);
router.get('/contest/:contestId/leaderboard', authenticate, entryController.getLeaderboard);
router.put('/:id/status', authenticate, isAdmin, entryController.updateEntryStatus);

module.exports = router;
