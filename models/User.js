const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  uid: { type: String, unique: true },
  name: String,
  email: { type: String, unique: true },
  phone: String,
  passwordHash: String,
  status: { type: String, default: 'active' },
  referralCode: { type: String, unique: true },
  referredBy: { type: String, default: null },
  hasPlayed: { type: Boolean, default: false },
  role: { type: String, default: 'user' },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', function (next) {
  if (!this.uid) {
    this.uid = `U${Math.floor(10000 + Math.random() * 90000)}`;
  }
  if (!this.referralCode) {
    this.referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  }
  next();
});

module.exports = mongoose.model('User', userSchema);