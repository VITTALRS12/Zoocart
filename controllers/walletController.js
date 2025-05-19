const Wallet = require('../models/Wallet');
const razorpayService = require('../services/razorpay.service');

exports.getWallet = async (req, res) => {
  try {
    const { userId } = req.params;

    const wallet = await Wallet.findOne({ userId })
      .sort({ 'transactions.createdAt': -1 });

    if (!wallet) {
      return res.send({
        success: true,
        data: {
          balance: 0,
          transactions: []
        }
      });
    }

    res.send({
      success: true,
      data: wallet
    });
  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
};

exports.addMoney = async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (amount <= 0) {
      return res.status(400).send({ success: false, message: 'Amount must be greater than 0' });
    }

    // Create Razorpay order
    const order = await razorpayService.createOrder(amount);

    res.send({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount / 100, // Convert back to INR
        currency: order.currency,
        razorpayKey: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
};


exports.makePayment = async (req, res) => {
  try {
    const { userId, amount, productId } = req.body;

    if (amount <= 0) {
      return res.status(400).send({ success: false, message: 'Amount must be greater than 0' });
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet || wallet.balance < amount) {
      return res.status(400).send({ success: false, message: 'Insufficient balance' });
    }

    // Process product purchase here if productId is provided
    if (productId) {
      const Product = require('../models/Product');
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).send({ success: false, message: 'Product not found' });
      }
      if (product.price > amount) {
        return res.status(400).send({ success: false, message: 'Insufficient amount for this product' });
      }
    }

    const updatedWallet = await Wallet.findOneAndUpdate(
      { userId },
      {
        $inc: { balance: -amount },
        $push: {
          transactions: {
            amount,
            type: 'debit',
            description: productId ? `Purchase for product ${productId}` : 'Wallet debit'
          }
        }
      },
      { new: true }
    );

    res.send({
      success: true,
      message: productId ? 'Product purchased successfully' : 'Payment processed successfully',
      data: updatedWallet
    });
  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
};



exports.verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, amount, userId } = req.body;

    // Validate the orderId, amount, and userId provided in the request
    if (!orderId || !paymentId || !amount || !userId) {
      return res.status(400).send({ success: false, message: 'OrderId, paymentId, amount, and userId are required' });
    }

    // Fetch the order from Razorpay to verify the payment amount
    const order = await razorpayService.fetchOrder(orderId);
    if (!order || order.amount / 100 !== amount * 100) {
      return res.status(400).send({ success: false, message: 'Payment amount does not match the order amount' });
    }

    // Get the payment details
    const paymentDetails = await razorpayService.getPaymentDetails(paymentId);
    if (!paymentDetails) {
      return res.status(400).send({ success: false, message: 'Payment details not found' });
    }

    // Perform payment verification
    const verificationResult = await razorpayService.verifyPayment(paymentDetails.id, orderId);
    if (!verificationResult.isVerified) {
      return res.status(400).send({ success: false, message: 'Payment verification failed' });
    }

    // Update the user's wallet with the payment
    const transaction = {
      amount,
      type: 'credit',
      description: 'Added via Razorpay',
      paymentId: paymentDetails.id,
      orderId: orderId,
      receiptId: paymentDetails.receipt || null,
      paymentMethod: paymentDetails.method || 'other',
      status: paymentDetails.status || 'captured',
      createdAt: new Date(paymentDetails.created_at * 1000), // if timestamp is in seconds
    };

    const wallet = await Wallet.findOneAndUpdate(
      { userId },
      {
        $inc: { balance: amount },
        $push: { transactions: transaction }
      },
      { upsert: true, new: true }
    );

    res.send({
      success: true,
      message: 'Payment verified and wallet updated',
      data: wallet
    });
  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
};
