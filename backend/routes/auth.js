const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const storage = require('../storage/dbStorage');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');
const { sendOTPEmail, sendVerificationLinkEmail } = require('../utils/emailService');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d'
  });
};

// @route   POST /api/auth/register
// @desc    Đăng ký user mới
// @access  Public
router.post('/register', authLimiter, [
  body('username').trim().isLength({ min: 3 }).withMessage('Username phải có ít nhất 3 ký tự'),
  body('email').isEmail().withMessage('Email không hợp lệ'),
  body('password').isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
  body('fullName').trim().notEmpty().withMessage('Tên không được để trống')
], async (req, res) => {
  try {
    console.log('📝 Register request:', { 
      username: req.body.username, 
      email: req.body.email,
      fullName: req.body.fullName,
      hasPassword: !!req.body.password 
    });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      const firstError = errors.array()[0];
      return res.status(400).json({ 
        message: firstError.msg,
        errors: errors.array() 
      });
    }

    const { username, email, password, fullName } = req.body;

    // Check if user exists
    console.log('🔍 Checking existing users...');
    const existingByEmail = await storage.users.findByEmail(email);
    const existingByUsername = await storage.users.findByUsername(username);
    
    if (existingByEmail) {
      console.log('❌ Email already exists');
      return res.status(400).json({ 
        message: 'Email đã được sử dụng. Bạn có muốn đăng nhập không?',
        code: 'EMAIL_EXISTS'
      });
    }
    if (existingByUsername) {
      console.log('❌ Username already exists');
      return res.status(400).json({ 
        message: 'Username đã được sử dụng. Vui lòng chọn username khác.',
        code: 'USERNAME_EXISTS'
      });
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (unverified by default)
    console.log('👤 Creating user...');
    const user = await storage.users.create({
      username,
      email,
      password: hashedPassword,
      fullName,
      avatar: '',
      isOnline: false,
      lastSeen: new Date().toISOString(),
      emailVerified: 0, // Not verified yet
    });

    if (!user || !user.id) {
      console.error('❌ User creation failed - no user returned');
      return res.status(500).json({ message: 'Không thể tạo tài khoản. Vui lòng thử lại.' });
    }

    console.log('✅ User created:', user.id);

    // Generate OTP (6 digits)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Generate verification token (for link verification)
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Save OTP verification record (expires in 10 minutes)
    const otpExpiresAt = new Date();
    otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 10);

    await storage.emailVerifications.create({
      userId: user.id,
      email: user.email,
      code: otpCode,
      token: null,
      type: 'otp',
      expiresAt: otpExpiresAt.toISOString(),
    });

    // Save link verification record (expires in 24 hours)
    const linkExpiresAt = new Date();
    linkExpiresAt.setHours(linkExpiresAt.getHours() + 24);

    await storage.emailVerifications.create({
      userId: user.id,
      email: user.email,
      code: null,
      token: verificationToken,
      type: 'link',
      expiresAt: linkExpiresAt.toISOString(),
    });

    // Send OTP email
    try {
      await sendOTPEmail(user.email, otpCode, user.fullName);
      console.log('✅ OTP email sent to:', user.email);
    } catch (emailError) {
      console.error('⚠️ Failed to send OTP email:', emailError);
      // Continue anyway - user can request resend
    }

    // Send verification link email
    try {
      await sendVerificationLinkEmail(user.email, verificationToken, user.fullName);
      console.log('✅ Verification link email sent to:', user.email);
    } catch (emailError) {
      console.error('⚠️ Failed to send verification link email:', emailError);
      // Continue anyway
    }

    // Generate token (user can login but email not verified)
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'Đăng ký thành công. Vui lòng xác thực email.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
        emailVerified: false,
      },
      requiresVerification: true,
      verificationMethod: 'otp', // or 'link'
    });
  } catch (error) {
    console.error('Register error:', error);
    const errorMessage = error.message || 'Lỗi server';
    res.status(500).json({ 
      message: errorMessage.includes('UNIQUE constraint') 
        ? 'Email hoặc username đã được sử dụng' 
        : 'Lỗi server. Vui lòng thử lại.'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Đăng nhập user
// @access  Public
router.post('/login', authLimiter, [
  body('email').isEmail().withMessage('Email không hợp lệ'),
  body('password').notEmpty().withMessage('Mật khẩu không được để trống')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({ 
        message: firstError.msg,
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find user with password
    const userWithPassword = await storage.users.findByEmail(email);
    if (!userWithPassword) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    // Get password from database
    const dbPassword = await storage.users.getPassword(userWithPassword.id);
    
    if (!dbPassword) {
      console.error('Password not found for user:', userWithPassword.id);
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, dbPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    // Update online status
    await storage.users.updateOnlineStatus(userWithPassword.id, true);
    const user = await storage.users.findById(userWithPassword.id);

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
        isOnline: user.isOnline,
        // Ensure client knows email verification status
        emailVerified: !!user.emailVerified,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: error.message || 'Lỗi server. Vui lòng thử lại.'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Lấy thông tin user hiện tại
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        fullName: req.user.fullName,
        avatar: req.user.avatar,
        isOnline: req.user.isOnline,
        // Also return email verification status here
        emailVerified: !!req.user.emailVerified,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   POST /api/auth/logout
// @desc    Đăng xuất
// @access  Private
router.post('/logout', auth, async (req, res) => {
  try {
    await storage.users.updateOnlineStatus(req.user.id, false);
    res.json({ message: 'Đăng xuất thành công' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   POST /api/auth/send-verification
// @desc    Gửi lại mã OTP hoặc link xác thực
// @access  Public (có thể cần auth sau)
router.post('/send-verification', authLimiter, [
  body('email').isEmail().withMessage('Email không hợp lệ'),
  body('type').isIn(['otp', 'link']).withMessage('Type phải là "otp" hoặc "link"')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email, type } = req.body;

    // Find user
    const user = await storage.users.findByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'Email không tồn tại' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email đã được xác thực' });
    }

    // Delete old verification records
    await storage.emailVerifications.deleteExpired();

    if (type === 'otp') {
      // Generate new OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date();
      otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 10);

      await storage.emailVerifications.create({
        userId: user.id,
        email: user.email,
        code: otpCode,
        token: null,
        type: 'otp',
        expiresAt: otpExpiresAt.toISOString(),
      });

      // Send OTP email
      try {
        await sendOTPEmail(user.email, otpCode, user.fullName);
        res.json({ message: 'Mã OTP đã được gửi đến email của bạn' });
      } catch (emailError) {
        console.error('Failed to send OTP email:', emailError);
        res.status(500).json({ message: 'Không thể gửi email. Vui lòng thử lại sau.' });
      }
    } else {
      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const linkExpiresAt = new Date();
      linkExpiresAt.setHours(linkExpiresAt.getHours() + 24);

      await storage.emailVerifications.create({
        userId: user.id,
        email: user.email,
        code: null,
        token: verificationToken,
        type: 'link',
        expiresAt: linkExpiresAt.toISOString(),
      });

      // Send verification link email
      try {
        await sendVerificationLinkEmail(user.email, verificationToken, user.fullName);
        res.json({ message: 'Liên kết xác thực đã được gửi đến email của bạn' });
      } catch (emailError) {
        console.error('Failed to send verification link email:', emailError);
        res.status(500).json({ message: 'Không thể gửi email. Vui lòng thử lại sau.' });
      }
    }
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   POST /api/auth/verify-email
// @desc    Xác thực email bằng OTP hoặc token
// @access  Public
router.post('/verify-email', authLimiter, [
  body('email').isEmail().withMessage('Email không hợp lệ'),
  body('type').isIn(['otp', 'link']).withMessage('Type phải là "otp" hoặc "link"')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email, code, token, type } = req.body;

    // Find user
    const user = await storage.users.findByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'Email không tồn tại' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email đã được xác thực' });
    }

    let verification = null;

    if (type === 'otp') {
      if (!code) {
        return res.status(400).json({ message: 'Mã OTP là bắt buộc' });
      }
      verification = await storage.emailVerifications.findByCode(code);
      if (!verification || verification.email !== email) {
        return res.status(400).json({ message: 'Mã OTP không đúng hoặc đã hết hạn' });
      }
    } else {
      if (!token) {
        return res.status(400).json({ message: 'Token là bắt buộc' });
      }
      verification = await storage.emailVerifications.findByToken(token);
      if (!verification || verification.email !== email) {
        return res.status(400).json({ message: 'Token không đúng hoặc đã hết hạn' });
      }
    }

    // Mark verification as verified
    await storage.emailVerifications.markAsVerified(verification.id);

    // Update user emailVerified status
    await storage.users.updateEmailVerified(user.id, true);

    // Get updated user
    const updatedUser = await storage.users.findById(user.id);

    res.json({
      message: 'Email đã được xác thực thành công',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        avatar: updatedUser.avatar,
        emailVerified: true,
      }
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;
