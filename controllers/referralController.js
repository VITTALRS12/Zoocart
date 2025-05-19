const User = require('../models/User');
const Referral = require('../models/Referral');
const Wallet = require('../models/Wallet');

exports.getReferralInfo = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({ success: false, message: 'User not found' });
    }

    const referrals = await Referral.find({ referrerId: userId }).populate('refereeId', 'name email createdAt');
    const referredBy = user.referredBy ? await User.findOne({ referralCode: user.referredBy }) : null;

    res.send({
      success: true,
      data: {
        myReferralCode: user.referralCode,
        referredBy: referredBy ? {
          name: referredBy.name,
          referralCode: referredBy.referralCode
        } : null,
        totalReferrals: referrals.length,
        totalEarnings: referrals.reduce((sum, ref) => sum + ref.rewardEarned, 0),
        referrals: referrals.map(ref => ({
          name: ref.refereeId.name,
          email: ref.refereeId.email,
          joinedAt: ref.refereeId.createdAt,
          rewardEarned: ref.rewardEarned,
          date: ref.createdAt
        }))
      }
    });
  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
};

exports.applyReferral = async (req, res) => {
  try {
    const { userId, referralCode } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({ success: false, message: 'User not found' });
    }

    if (user.referredBy) {
      return res.status(400).send({ success: false, message: 'You have already used a referral code' });
    }

    const referrer = await User.findOne({ referralCode });
    if (!referrer) {
      return res.status(400).send({ success: false, message: 'Invalid referral code' });
    }

    if (referrer._id.toString() === userId) {
      return res.status(400).send({ success: false, message: 'You cannot use your own referral code' });
    }

    user.referredBy = referralCode;
    await user.save();

    // Create referral record
    const newReferral = new Referral({
      referrerId: referrer._id,
      refereeId: userId,
      rewardEarned: 100
    });
    await newReferral.save();

    // Add reward to referrer's wallet
    await Wallet.findOneAndUpdate(
      { userId: referrer._id },
      { $inc: { balance: 100 } },
      { upsert: true, new: true }
    );

    res.send({ 
      success: true, 
      message: 'Referral applied successfully',
      reward: 100
    });
  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
};