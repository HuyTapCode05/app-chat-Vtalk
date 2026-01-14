const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const storage = require('../storage/dbStorage');

// @route   POST /api/blocks
// @desc    Chặn người dùng
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { blockedId } = req.body;
    console.log('🔴 POST /blocks:', { blockedId, userId: req.user.id, body: req.body });
    
    if (!blockedId) {
      console.log('❌ Missing blockedId');
      return res.status(400).json({ message: 'blockedId là bắt buộc' });
    }

    if (blockedId === req.user.id) {
      console.log('❌ Cannot block self');
      return res.status(400).json({ message: 'Không thể chặn chính mình' });
    }

    // Check if user exists
    const targetUser = await storage.users.findById(blockedId);
    if (!targetUser) {
      console.log('❌ User not found:', blockedId);
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    // Check if already blocked
    const isBlocked = await storage.blocks.isBlocked(req.user.id, blockedId);
    if (isBlocked) {
      console.log('❌ Already blocked');
      return res.status(400).json({ message: 'Đã chặn người dùng này' });
    }

    // Remove from friends if they are friends
    const areFriends = await storage.friends.areFriends(req.user.id, blockedId);
    if (areFriends) {
      await storage.friends.removeFriend(req.user.id, blockedId);
    }

    // Block user
    console.log('🔴 Attempting to block user...');
    const block = await storage.blocks.blockUser(req.user.id, blockedId);
    console.log('🔴 Block created:', block);

    res.status(201).json({ message: 'Đã chặn người dùng', block });
  } catch (error) {
    console.error('❌ Error in POST /blocks:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// @route   DELETE /api/blocks/:blockedId
// @desc    Bỏ chặn người dùng
// @access  Private
router.delete('/:blockedId', auth, async (req, res) => {
  try {
    const { blockedId } = req.params;
    
    const isBlocked = await storage.blocks.isBlocked(req.user.id, blockedId);
    if (!isBlocked) {
      return res.status(400).json({ message: 'Chưa chặn người dùng này' });
    }

    await storage.blocks.unblockUser(req.user.id, blockedId);

    res.json({ message: 'Đã bỏ chặn người dùng' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/blocks
// @desc    Lấy danh sách người dùng đã chặn
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const blockedIds = await storage.blocks.getBlockedUsers(req.user.id);
    const blockedUsers = await Promise.all(
      blockedIds.map(async (id) => {
        const user = await storage.users.findById(id);
        if (!user) return null;
        return {
          _id: user.id,
          id: user.id,
          fullName: user.fullName,
          username: user.username,
          avatar: user.avatar,
        };
      })
    );
    
    res.json(blockedUsers.filter(u => u !== null));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/blocks/check/:userId
// @desc    Kiểm tra xem có bị chặn không
// @access  Private
router.get('/check/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if current user blocked target user
    const blockedByMe = await storage.blocks.isBlocked(req.user.id, userId);
    // Check if target user blocked current user
    const blockedByThem = await storage.blocks.isBlocked(userId, req.user.id);
    
    res.json({
      blockedByMe,
      blockedByThem,
      isBlocked: blockedByMe || blockedByThem
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;

