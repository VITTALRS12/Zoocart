const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  target: String,
  otpCode: String,
  expiresAt: Date,
  used: { type: Boolean, default: false },
  userData: {
    name: String,
    email: String,
    phone: String,
    passwordHash: String,
    referralCode: String
  },
}, {
  timestamps: true // <-- This adds createdAt and updatedAt fields automatically
});

module.exports = mongoose.model('Otp', otpSchema);
