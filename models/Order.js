const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  total: Number,
  status: String, // processing, shipped, delivered, etc.
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
