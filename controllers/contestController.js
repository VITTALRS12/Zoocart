const Contest = require('../models/Contest');
const User = require('../models/User');

exports.getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await Contest.find()
      .sort({ score: -1 })
      .limit(10)
      .populate('playerId', 'name email');

    const winner = leaderboard.length > 0 ? leaderboard[0] : null;

    const leaderboardWithDetails = leaderboard.map((entry, index) => ({
      rank: index + 1,
      playerId: entry.playerId._id,
      playerName: entry.playerId.name || 'Unknown',
      score: entry.score,
      createdAt: entry.createdAt,
    }));

    res.send({ 
      success: true, 
      leaderboard: leaderboardWithDetails,
      winner: winner ? {
        name: winner.playerId.name,
        score: winner.score
      } : null
    });
  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
};

exports.saveContestScore = async (req, res) => {
  const { playerId, score } = req.body;

  try {
    const user = await User.findById(playerId);
    if (!user) {
      return res.status(404).send({ success: false, message: 'User not found' });
    }

    if (user.hasPlayed) {
      return res.status(400).send({ 
        success: false, 
        message: 'You can only play once.' 
      });
    }

    if (!/^\d{12}$/.test(score)) {
      throw new Error('Score must be exactly 12 digits (numbers only).');
    }

    const sortedScore = score
      .split('')
      .sort((a, b) => {
        if (a === '0' && b !== '0') return -1;
        if (a !== '0' && b === '0') return 1;
        return a.localeCompare(b);
      })
      .join('');

    const newScore = new Contest({
      playerId,
      score: sortedScore,
    });

    await newScore.save();
    
    user.hasPlayed = true;
    await user.save();

    res.send({
      success: true,
      message: 'Score saved successfully.',
      formattedScore: sortedScore,
    });
  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
};

exports.getUserStats = async (req, res) => {
  try {
    const { playerId } = req.params;

    const highestScore = await Contest.findOne({ playerId })
      .sort({ score: -1 })
      .limit(1);

    const allScores = await Contest.find().sort({ score: -1 });
    const userRank = allScores.findIndex(entry => entry.playerId.toString() === playerId) + 1;

    const attempts = await Contest.countDocuments({ playerId });

    res.send({
      success: true,
      stats: {
        highestScore: highestScore ? highestScore.score : null,
        rank: userRank > 0 ? userRank : null,
        attempts
      }
    });
  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
};