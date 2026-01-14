const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const storage = require('../storage/dbStorage');

// @route   POST /api/friends/request
// @desc    Gửi lời mời kết bạn
// @access  Private
router.post('/request', auth, async (req, res) => {
  try {
    const { toUserId } = req.body;
    
    if (!toUserId) {
      return res.status(400).json({ message: 'toUserId là bắt buộc' });
    }

    if (toUserId === req.user.id) {
      return res.status(400).json({ message: 'Không thể gửi lời mời kết bạn cho chính mình' });
    }

    // Check if user exists
    const targetUser = await storage.users.findById(toUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    // Check if already friends
    const areFriends = await storage.friends.areFriends(req.user.id, toUserId);
    if (areFriends) {
      return res.status(400).json({ message: 'Đã là bạn bè' });
    }

    // Check if request already exists
    const existingRequest = await storage.friendRequests.findByUsers(req.user.id, toUserId);
    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return res.status(400).json({ message: 'Đã gửi lời mời kết bạn' });
      }
      if (existingRequest.status === 'accepted') {
        return res.status(400).json({ message: 'Đã là bạn bè' });
      }
    }

    // Create friend request
    const request = await storage.friendRequests.create({
      fromUserId: req.user.id,
      toUserId: toUserId,
      status: 'pending'
    });

    res.status(201).json(request);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/friends/requests
// @desc    Lấy danh sách lời mời kết bạn (đã nhận và đã gửi)
// @access  Private
router.get('/requests', auth, async (req, res) => {
  try {
    const pending = await storage.friendRequests.getPendingRequests(req.user.id);
    const sent = await storage.friendRequests.getSentRequests(req.user.id);

    // Populate user info
    const populateRequests = async (requests, isIncoming) => {
      return await Promise.all(requests.map(async (req) => {
        const userId = isIncoming ? req.fromUserId : req.toUserId;
        const user = await storage.users.findById(userId);
        return {
          ...req,
          _id: req.id,
          id: req.id,
          user: user ? {
            _id: user.id,
            id: user.id,
            fullName: user.fullName,
            username: user.username,
            avatar: user.avatar,
            isOnline: user.isOnline || false,
          } : null
        };
      }));
    };

    const populatedPending = await populateRequests(pending, true);
    const populatedSent = await populateRequests(sent, false);

    res.json({
      incoming: populatedPending,
      sent: populatedSent
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   PUT /api/friends/request/:id/accept
// @desc    Chấp nhận lời mời kết bạn
// @access  Private
router.put('/request/:id/accept', auth, async (req, res) => {
  try {
    const request = await storage.friendRequests.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Không tìm thấy lời mời kết bạn' });
    }

    if (request.toUserId !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền chấp nhận lời mời này' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Lời mời đã được xử lý' });
    }

    // Update request status
    await storage.friendRequests.update(req.params.id, { status: 'accepted' });

    // Add to friends table
    await storage.friends.addFriend(request.fromUserId, request.toUserId);

    res.json({ message: 'Đã chấp nhận lời mời kết bạn' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   PUT /api/friends/request/:id/reject
// @desc    Từ chối lời mời kết bạn
// @access  Private
router.put('/request/:id/reject', auth, async (req, res) => {
  try {
    const request = await storage.friendRequests.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Không tìm thấy lời mời kết bạn' });
    }

    if (request.toUserId !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền từ chối lời mời này' });
    }

    // Update request status
    await storage.friendRequests.update(req.params.id, { status: 'rejected' });

    res.json({ message: 'Đã từ chối lời mời kết bạn' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   DELETE /api/friends/request/:id
// @desc    Hủy lời mời kết bạn (chỉ người gửi mới hủy được)
// @access  Private
router.delete('/request/:id', auth, async (req, res) => {
  try {
    const request = await storage.friendRequests.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Không tìm thấy lời mời kết bạn' });
    }

    if (request.fromUserId !== req.user.id) {
      return res.status(403).json({ message: 'Chỉ người gửi mới có thể hủy lời mời' });
    }

    await storage.friendRequests.delete(req.params.id);

    res.json({ message: 'Đã hủy lời mời kết bạn' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/friends
// @desc    Lấy danh sách bạn bè
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const friendIds = await storage.friends.getFriends(req.user.id);
    const friends = await Promise.all(
      friendIds.map(async (id) => {
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
    
    res.json(friends.filter(f => f !== null));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   DELETE /api/friends/:userId
// @desc    Xóa bạn bè
// @access  Private
router.delete('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    await storage.friends.removeFriend(req.user.id, userId);

    res.json({ message: 'Đã xóa bạn bè' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;

