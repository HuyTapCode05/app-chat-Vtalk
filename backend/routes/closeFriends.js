const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const storage = require('../storage/dbStorage');

// @route   POST /api/close-friends
// @desc    Đánh dấu bạn thân
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { friendId } = req.body;
    
    if (!friendId) {
      return res.status(400).json({ message: 'friendId là bắt buộc' });
    }

    if (friendId === req.user.id) {
      return res.status(400).json({ message: 'Không thể đánh dấu chính mình là bạn thân' });
    }

    // Check if user exists
    const targetUser = await storage.users.findById(friendId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    // Check if already close friend
    const isCloseFriend = await storage.closeFriends.isCloseFriend(req.user.id, friendId);
    if (isCloseFriend) {
      return res.status(400).json({ message: 'Đã đánh dấu bạn thân' });
    }

    // Check if they are friends
    const areFriends = await storage.friends.areFriends(req.user.id, friendId);
    if (!areFriends) {
      return res.status(400).json({ message: 'Cần phải là bạn bè trước' });
    }

    const closeFriend = await storage.closeFriends.addCloseFriend(req.user.id, friendId);
    res.status(201).json({ message: 'Đã đánh dấu bạn thân', closeFriend });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   DELETE /api/close-friends/:friendId
// @desc    Bỏ đánh dấu bạn thân
// @access  Private
router.delete('/:friendId', auth, async (req, res) => {
  try {
    const { friendId } = req.params;
    
    await storage.closeFriends.removeCloseFriend(req.user.id, friendId);
    res.json({ message: 'Đã bỏ đánh dấu bạn thân' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/close-friends
// @desc    Lấy danh sách bạn thân
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const closeFriendIds = await storage.closeFriends.getCloseFriends(req.user.id);
    const closeFriends = await Promise.all(
      closeFriendIds.map(async (id) => {
        const user = await storage.users.findById(id);
        if (!user) return null;
        return {
          _id: user.id,
          id: user.id,
          fullName: user.fullName,
          username: user.username,
          avatar: user.avatar,
          isOnline: user.isOnline || false,
        };
      })
    );
    
    res.json(closeFriends.filter(f => f !== null));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;

