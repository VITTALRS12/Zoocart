const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },

  // Razorpay payment details
  paymentId: { type: String }, // razorpay_payment_id
  orderId: { type: String },   // razorpay_order_id
  receiptId: { type: String }, // your custom receipt
  paymentMethod: {
    type: String,
    enum: ['card', 'netbanking', 'upi', 'wallet', 'emi', 'paylater', 'other']
  },
  status: {
    type: String,
    enum: ['created', 'authorized', 'captured', 'failed', 'refunded'],
    default: 'created'
  },
  cardInfo: {
    last4: String,
    network: String,
    type: String,
    issuer: String
  },
  upiInfo: {
    vpa: String
  },
  walletInfo: {
    provider: String
  }
});

const walletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  balance: { type: Number, default: 0 },
  razorpayId: String, // customer id (if created on Razorpay)
  transactions: [transactionSchema]
});

module.exports = mongoose.model('Wallet', walletSchema);
