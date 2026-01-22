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
const { loginQueue, registerQueue } = require('../utils/requestQueue');
const { getCached, setCached } = require('../utils/queryOptimizer');
const sessionManager = require('../utils/sessionManager');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d'
  });
};

// @route   POST /api/auth/register
// @desc    Đăng ký user mới (tối ưu với queue)
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

    // Queue register request để tránh overload
    const result = await registerQueue.add(async () => {
      // Check if user exists (with caching)
      console.log('🔍 Checking existing users...');
      const emailCacheKey = `user_email_${email}`;
      const usernameCacheKey = `user_username_${username}`;
      
      let existingByEmail = getCached(emailCacheKey);
      let existingByUsername = getCached(usernameCacheKey);
      
      if (!existingByEmail) {
        existingByEmail = await storage.users.findByEmail(email);
        if (existingByEmail) setCached(emailCacheKey, existingByEmail);
      }
      
      if (!existingByUsername) {
        existingByUsername = await storage.users.findByUsername(username);
        if (existingByUsername) setCached(usernameCacheKey, existingByUsername);
      }
      
      if (existingByEmail) {
        console.log('❌ Email already exists');
        throw new Error('EMAIL_EXISTS');
      }
      if (existingByUsername) {
        console.log('❌ Username already exists');
        throw new Error('USERNAME_EXISTS');
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
        throw new Error('USER_CREATION_FAILED');
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

      // Send emails asynchronously (non-blocking)
      Promise.all([
        sendOTPEmail(user.email, otpCode, user.fullName).catch(err => {
          console.error('⚠️ Failed to send OTP email:', err);
        }),
        sendVerificationLinkEmail(user.email, verificationToken, user.fullName).catch(err => {
          console.error('⚠️ Failed to send verification link email:', err);
        })
      ]).then(() => {
        console.log('✅ Verification emails sent to:', user.email);
      });

      // Generate token (user can login but email not verified)
      const token = generateToken(user.id);

      return {
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
        verificationMethod: 'otp',
      };
    }, 1); // High priority for registration

    res.status(201).json(result);
  } catch (error) {
    console.error('Register error:', error);
    
    if (error.message === 'EMAIL_EXISTS') {
      return res.status(400).json({ 
        message: 'Email đã được sử dụng. Bạn có muốn đăng nhập không?',
        code: 'EMAIL_EXISTS'
      });
    }
    
    if (error.message === 'USERNAME_EXISTS') {
      return res.status(400).json({ 
        message: 'Username đã được sử dụng. Vui lòng chọn username khác.',
        code: 'USERNAME_EXISTS'
      });
    }
    
    if (error.message === 'USER_CREATION_FAILED') {
      return res.status(500).json({ message: 'Không thể tạo tài khoản. Vui lòng thử lại.' });
    }
    
    const errorMessage = error.message || 'Lỗi server';
    res.status(500).json({ 
      message: errorMessage.includes('UNIQUE constraint') 
        ? 'Email hoặc username đã được sử dụng' 
        : 'Lỗi server. Vui lòng thử lại.'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Đăng nhập user (tối ưu với queue và caching)
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

    // Queue login request để tránh overload
    const result = await loginQueue.add(async () => {
      // Check cache first (for failed attempts protection)
      const cacheKey = `login_attempt_${email}`;
      const cachedAttempt = getCached(cacheKey);
      if (cachedAttempt && cachedAttempt.failed) {
        // If recent failed attempt, add small delay to prevent brute force
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Find user with password (cached if possible)
      const userCacheKey = `user_email_${email}`;
      let userWithPassword = getCached(userCacheKey);
      
      if (!userWithPassword) {
        userWithPassword = await storage.users.findByEmail(email);
        if (userWithPassword) {
          // Cache user for 30 seconds
          setCached(userCacheKey, userWithPassword);
        }
      }

      if (!userWithPassword) {
        // Cache failed attempt for 1 minute
        setCached(cacheKey, { failed: true }, 60000);
        throw new Error('EMAIL_NOT_FOUND');
      }

      // Get password from database
      const dbPassword = await storage.users.getPassword(userWithPassword.id);
      
      if (!dbPassword) {
        console.error('Password not found for user:', userWithPassword.id);
        setCached(cacheKey, { failed: true }, 60000);
        throw new Error('PASSWORD_NOT_FOUND');
      }
      
      // Check password
      const isMatch = await bcrypt.compare(password, dbPassword);
      if (!isMatch) {
        setCached(cacheKey, { failed: true }, 60000);
        throw new Error('PASSWORD_MISMATCH');
      }

      // Clear failed attempt cache
      getCached(cacheKey); // This will delete it

      // Update online status only if user doesn't have active sessions
      // (to support multiple devices)
      const hasActiveSessions = sessionManager.hasActiveSessions(userWithPassword.id);
      if (!hasActiveSessions) {
        storage.users.updateOnlineStatus(userWithPassword.id, true).catch(err => {
          console.error('Error updating online status:', err);
        });
      }

      const user = await storage.users.findById(userWithPassword.id);
      const token = generateToken(user.id);

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          avatar: user.avatar,
          isOnline: user.isOnline,
          emailVerified: !!user.emailVerified,
        },
      };
    }, 1); // High priority for login

    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    
    if (error.message === 'EMAIL_NOT_FOUND' || error.message === 'PASSWORD_NOT_FOUND' || error.message === 'PASSWORD_MISMATCH') {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    }
    
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
// @desc    Đăng xuất (từ device hiện tại)
// @access  Private
router.post('/logout', auth, async (req, res) => {
  try {
    const { logoutAll = false } = req.body;
    const userId = req.user.id;
    const sessionManager = require('../utils/sessionManager');
    
    if (logoutAll) {
      // Logout từ tất cả devices
      const userSockets = sessionManager.getUserSockets(userId);
      
      // Emit logout event to all devices via Socket.IO
      const io = require('../routes/users').getIO?.();
      if (io) {
        userSockets.forEach(socketId => {
          const socket = io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('force-logout', { reason: 'Logged out from another device' });
            socket.disconnect();
          }
          sessionManager.removeSession(socketId);
        });
      }
      
      await storage.users.updateOnlineStatus(userId, false);
      res.json({ message: 'Đã đăng xuất khỏi tất cả thiết bị' });
    } else {
      // Logout chỉ từ device hiện tại (REST API call)
      // Socket.IO sẽ handle disconnect event
      const deviceCount = sessionManager.getDeviceCount(userId);
      
      if (deviceCount <= 1) {
        // Last device, mark offline
        await storage.users.updateOnlineStatus(userId, false);
      }
      
      res.json({ 
        message: 'Đăng xuất thành công',
        remainingDevices: Math.max(0, deviceCount - 1)
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/auth/devices
// @desc    Lấy danh sách devices đang đăng nhập
// @access  Private
router.get('/devices', auth, async (req, res) => {
  try {
    const sessionManager = require('../utils/sessionManager');
    const devices = sessionManager.getUserDevices(req.user.id);
    
    res.json({
      devices: devices.map(device => ({
        platform: device.platform,
        connectedAt: device.connectedAt,
        lastSeen: device.lastSeen,
        deviceId: device.deviceId
      })),
      deviceCount: devices.length
    });
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
