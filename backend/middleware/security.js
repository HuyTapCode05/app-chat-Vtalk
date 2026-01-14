// Security middleware - Rate limiting và validation
/**
 * Security Middleware
 * Rate limiting, input sanitization, and security headers
 */

const rateLimit = require('express-rate-limit');
const config = require('../config/config');

// Rate limiting cho đăng ký/đăng nhập
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 20, // Tối đa 20 requests (tăng lên cho dev)
  message: 'Quá nhiều lần thử. Vui lòng thử lại sau 15 phút.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limit trong development
    return process.env.NODE_ENV === 'development';
  },
});

// Rate limiting cho API calls
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 100, // Tối đa 100 requests
  message: 'Quá nhiều requests. Vui lòng thử lại sau.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Sanitize input - loại bỏ các ký tự nguy hiểm
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // Loại bỏ script tags và các ký tự nguy hiểm
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

// Hide sensitive headers
const hideSensitiveHeaders = (req, res, next) => {
  // Remove sensitive headers from response
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  next();
};

module.exports = {
  authLimiter,
  apiLimiter,
  sanitizeInput,
  hideSensitiveHeaders,
};

