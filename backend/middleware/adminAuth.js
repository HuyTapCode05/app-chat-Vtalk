// backend/middleware/adminAuth.js
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { get } = require('../database/sqlite');

const adminAuth = async (req, res, next) => {
  // First, verify token using the logic from the standard auth middleware
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ message: 'Từ chối truy cập. Không có token.' });
  }

  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Từ chối truy cập. Token không hợp lệ.' });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await get('SELECT * FROM users WHERE id = ?', [decoded.id]);

    if (!user) {
      return res.status(401).json({ message: 'Người dùng không tồn tại.' });
    }

    // Now, check for admin role
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Từ chối truy cập. Yêu cầu quyền quản trị viên.' });
    }

    // Attach user to request object and proceed
    req.user = user;
    next();
  } catch (error) {
    console.error('Lỗi xác thực admin:', error);
    res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
};

module.exports = adminAuth;

