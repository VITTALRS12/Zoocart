const WalletTransaction = require('../models/WalletTransaction');
const User = require('../models/User');

// GET /api/wallet/balance
exports.getWalletBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('walletBalance');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ walletBalance: user.walletBalance });
  } catch (err) {
    console.error('Get Wallet Balance Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/wallet/add
exports.addTransaction = async (req, res) => {
  try {
    const { amount, source, description } = req.body;

    if (!amount || !source) {
      return res.status(400).json({ message: 'Amount and source are required.' });
    }

    const tx = new WalletTransaction({
      userId: req.user._id,
      amount,
      source,
      description
    });

    await tx.save();

    // Update wallet balance
    await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { walletBalance: amount } },
      { new: true }
    );

    res.status(201).json(tx);
  } catch (err) {
    console.error('Add Transaction Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/wallet/transactions
exports.getTransactionHistory = async (req, res) => {
  try {
    const transactions = await WalletTransaction.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    console.error('Get Transaction History Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
