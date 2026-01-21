const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const storage = require('../storage/dbStorage');
const upload = require('../middleware/upload');
const path = require('path');

// Get io instance from app
let io;
const setIO = (socketIO) => {
  io = socketIO;
};

// Make setIO available on the router
router.setIO = setIO;

// @route   GET /api/users/all
// @desc    [ADMIN] Lấy danh sách tất cả users
// @access  Admin
router.get('/all', adminAuth, async (req, res) => {
  try {
    const allUsers = await storage.users.getAllUsers();
    res.json(allUsers);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách tất cả người dùng (admin):', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/users
// @desc    Lấy danh sách tất cả users (trừ user hiện tại)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const allUsers = await storage.users.getAllUsers();
    const users = allUsers
      .filter(u => u.id !== req.user.id)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
    
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/users/search
// @desc    Tìm kiếm users
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json([]);
    }

    const users = await storage.users.searchUsers(q);
    const filtered = users
      .filter(u => u.id !== req.user.id)
      .slice(0, 20);
    
    res.json(filtered);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/users/me
// @desc    Lấy thông tin user hiện tại
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await storage.users.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy user' });
    }
    
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   PUT /api/users/me
// @desc    Cập nhật thông tin user hiện tại
// @access  Private
router.put('/me', auth, async (req, res) => {
  try {
    const { fullName, username, avatar, coverPhoto } = req.body;
    
    // Validate
    if (fullName && !fullName.trim()) {
      return res.status(400).json({ message: 'Tên không được để trống' });
    }

    // Check if username is already taken (if changing username)
    if (username) {
      const existingUser = await storage.users.findByUsername(username);
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(400).json({ message: 'Username đã được sử dụng' });
      }
    }

    // Update user
    const updates = {};
    if (fullName !== undefined) updates.fullName = fullName.trim();
    if (username !== undefined) updates.username = username.trim();
    if (avatar !== undefined) updates.avatar = avatar;
    if (coverPhoto !== undefined) updates.coverPhoto = coverPhoto;

    const updatedUser = await storage.users.update(req.user.id, updates);
    
    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   POST /api/users/me/avatar
// @desc    Upload ảnh đại diện
// @access  Private
router.post('/me/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Không có file được upload' });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;
    const updatedUser = await storage.users.update(req.user.id, { avatar: avatarUrl });
    
    // Emit socket event to notify others about avatar update
    if (io) {
      io.emit('user-avatar-updated', {
        userId: updatedUser.id,
        avatar: updatedUser.avatar
      });
      console.log('📢 Emitted user-avatar-updated for user:', updatedUser.id);
    }
    
    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   POST /api/users/me/cover
// @desc    Upload ảnh bìa
// @access  Private
router.post('/me/cover', auth, upload.single('coverPhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Không có file được upload' });
    }

    const coverPhotoUrl = `/uploads/${req.file.filename}`;
    const updatedUser = await storage.users.update(req.user.id, { coverPhoto: coverPhotoUrl });
    
    // Emit socket event to notify others about cover photo update
    if (io) {
      io.emit('user-cover-updated', {
        userId: updatedUser.id,
        coverPhoto: updatedUser.coverPhoto
      });
      console.log('📢 Emitted user-cover-updated for user:', updatedUser.id);
    }
    
    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/users/:id
// @desc    Lấy thông tin một user
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await storage.users.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy user' });
    }
    
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;
module.exports.setIO = setIO;
