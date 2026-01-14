const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const storage = require('../storage/dbStorage');

// @route   POST /api/nicknames
// @desc    Đặt biệt danh cho người dùng
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { targetUserId, nickname } = req.body;
    
    if (!targetUserId || !nickname) {
      return res.status(400).json({ message: 'targetUserId và nickname là bắt buộc' });
    }

    if (targetUserId === req.user.id) {
      return res.status(400).json({ message: 'Không thể đặt biệt danh cho chính mình' });
    }

    // Check if user exists
    const targetUser = await storage.users.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    // Set nickname
    const nicknameRecord = await storage.nicknames.setNickname(
      req.user.id,
      targetUserId,
      nickname.trim()
    );

    res.status(201).json({ message: 'Đã đặt biệt danh', nickname: nicknameRecord });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   DELETE /api/nicknames/:targetUserId
// @desc    Xóa biệt danh
// @access  Private
router.delete('/:targetUserId', auth, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    
    await storage.nicknames.removeNickname(req.user.id, targetUserId);

    res.json({ message: 'Đã xóa biệt danh' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/nicknames
// @desc    Lấy tất cả biệt danh của user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const nicknames = await storage.nicknames.getNicknames(req.user.id);
    
    // Populate user info
    const populated = await Promise.all(
      nicknames.map(async (nick) => {
        const user = await storage.users.findById(nick.targetUserId);
        if (!user) return null;
        return {
          ...nick,
          user: {
            _id: user.id,
            id: user.id,
            fullName: user.fullName,
            username: user.username,
            avatar: user.avatar,
          }
        };
      })
    );
    
    res.json(populated.filter(n => n !== null));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/nicknames/:targetUserId
// @desc    Lấy biệt danh của một người dùng cụ thể
// @access  Private
router.get('/:targetUserId', auth, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    
    const nickname = await storage.nicknames.getNickname(req.user.id, targetUserId);
    
    if (!nickname) {
      return res.status(404).json({ message: 'Chưa đặt biệt danh' });
    }
    
    res.json(nickname);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;

