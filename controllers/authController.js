// File: controllers/authController.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Otp = require('../models/Otp');
const User = require('../models/User');
const Referral = require('../models/Referral');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const shortid = require('shortid');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function validateUserInput(name, email, password, confirmPassword) {
  if (!/^[a-zA-Z\s]{3,}$/.test(name)) {
    throw new Error('Name must be at least 3 characters long and contain only alphabets.');
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('Valid email is required.');
  }
  if (!/^\d{6,8}$/.test(password)) {
    throw new Error('Password must be 6 to 8 digits.');
  }
  if (password !== confirmPassword) {
    throw new Error('Passwords do not match.');
  }
}

// Step 1: Register User and Send OTP
exports.registerUser = async (req, res) => {
  const { fullName, email, phone, password, confirmPassword, referralCode } = req.body;
  const name = fullName;

  try {
    validateUserInput(name, email, password, confirmPassword);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ success: false, message: 'Email already registered.' });
    }

    const otp = generateOtp();
    const hashedPassword = await bcrypt.hash(password, 10);

    await Otp.deleteMany({ target: email });

    await new Otp({
      target: email,
      otpCode: otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      userData: {
        name,
        email,
        phone,
        passwordHash: hashedPassword,
        referralCode
      }
    }).save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP is: ${otp}`,
    });

    res.send({ success: true, message: 'OTP sent to email.' });
  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
};

// Step 2: Verify OTP and Create User
exports.verifyOtp = async (req, res) => {
  const { otpCode, email } = req.body;

  try {
    const otpRecord = await Otp.findOne({ otpCode, target: email, used: false }).sort({ createdAt: -1 });
    if (!otpRecord) throw new Error('OTP is invalid.');
    if (otpRecord.expiresAt < Date.now()) throw new Error('OTP has expired.');

    const { name, email: userEmail, phone, passwordHash, referralCode } = otpRecord.userData;
    const uid = `U${Math.floor(10000 + Math.random() * 90000)}`;

    let generatedCode;
    let isUnique = false;
    do {
      generatedCode = shortid.generate().toUpperCase();
      const exists = await User.findOne({ referralCode: generatedCode });
      if (!exists) isUnique = true;
    } while (!isUnique);

    const newUser = new User({
      uid,
      name,
      email: userEmail,
      phone,
      passwordHash,
      status: 'verified',
      referralCode: generatedCode,
      createdAt: Date.now()
    });

    let referrer = null;
    if (referralCode) {
      referrer = await User.findOne({ referralCode });
      if (referrer) newUser.referredBy = referralCode;
    }

    await newUser.save();
    otpRecord.used = true;
    await otpRecord.save();

    await Referral.create({
      userId: newUser._id,
      referralCode: generatedCode,
      referralLink: `http://localhost:3000/signup?ref=${generatedCode}`,
      totalReferrals: 0,
      paidReferrals: 0,
      totalEarnings: 0,
      referrals: []
    });

    if (referralCode && referrer) {
      const parentReferral = await Referral.findOne({ userId: referrer._id });
      if (parentReferral) {
        parentReferral.referrals.push({
          name: newUser.name,
          avatar: newUser.name[0].toUpperCase(),
          joinDate: new Date(),
          status: 'paid',
          earnings: 100
        });
        parentReferral.totalReferrals += 1;
        parentReferral.paidReferrals += 1;
        parentReferral.totalEarnings += 100;
        await parentReferral.save();

        await Wallet.findOneAndUpdate(
          { userId: referrer._id },
          { $inc: { balance: 100 } },
          { upsert: true, new: true }
        );

        await WalletTransaction.create({
          userId: referrer._id,
          amount: 100,
          source: 'referral',
          description: `Referral reward for inviting ${newUser.name}`
        });
      }
    }

    const token = jwt.sign({ _id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.send({
      success: true,
      message: 'User registered successfully.',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        referralCode: newUser.referralCode
      }
    });

  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
};


// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found.');

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new Error('Incorrect password.');

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    user.tokens = user.tokens || [];
    user.tokens.push(token);
    await user.save();

    res.send({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        referralCode: user.referralCode,
        hasPlayed: user.hasPlayed
      }
    });
  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).send({ success: false, message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id);
    if (!user) return res.status(404).send({ success: false, message: 'User not found' });

    user.tokens = user.tokens.filter(t => t !== token);
    await user.save();

    res.send({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
};

// Resend OTP
exports.resendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const otp = generateOtp();
    await Otp.deleteMany({ target: email });

    const otpData = {
      target: email,
      otpCode: otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    };

    await new Otp(otpData).save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your New OTP Code',
      text: `Your new OTP is: ${otp}`,
    });

    res.send({ success: true, message: 'New OTP sent to email.' });
  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found.');

    const otp = generateOtp();
    await Otp.deleteMany({ target: email });

    await new Otp({
      target: email,
      otpCode: otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      used: false,
      userData: { email },
    }).save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}`,
    });

    res.send({ success: true, message: 'OTP sent to email.' });
  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const { email, otp, password } = req.body;

  try {
    if (!/^\d{6,8}$/.test(password)) {
      throw new Error('Password must be 6 to 8 digits');
    }

    const otpRecord = await Otp.findOne({
      target: email,
      otpCode: otp,
      used: false
    });

    if (!otpRecord || otpRecord.expiresAt < Date.now()) {
      throw new Error('Invalid or expired OTP');
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();

    otpRecord.used = true;
    await otpRecord.save();

    res.send({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
};

// Get current user info
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-passwordHash -tokens -__v');
    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin Login
exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) throw new Error('User not found.');
    if (user.role !== 'admin') throw new Error('Access denied: Not an admin.');

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new Error('Incorrect password.');

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    user.tokens = user.tokens || [];
    user.tokens.push(token);
    await user.save();

    res.send({
      success: true,
      message: 'Admin login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    res.status(400).send({ success: false, message: err.message });
  }
};

