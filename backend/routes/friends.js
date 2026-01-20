const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const storage = require('../storage/dbStorage');

// @route   GET /api/friends/debug
// @desc    Debug friendship data
// @access  Private
router.get('/debug', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get raw friends data
    const friendIds = await storage.friends.getFriends(userId);
    
    // Get specific friend check
    const targetUserId = 'user_1767603684178_g8fg968ia';
    const areFriendsCheck = await storage.friends.areFriends(userId, targetUserId);
    
    // Get friend requests 
    const sentRequests = await storage.friendRequests.getSentRequests(userId);
    const pendingRequests = await storage.friendRequests.getPendingRequests(userId);
    
    res.json({
      currentUserId: userId,
      friendIds,
      targetUserId,
      areFriendsCheck,
      sentRequests,
      pendingRequests,
      friendsCount: friendIds.length
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ message: 'Debug error', error: error.message });
  }
});

// @route   GET /api/friends/check/:userId
// @desc    Kiểm tra có phải bạn bè không
// @access  Private
router.get('/check/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: 'userId là bắt buộc' });
    }

    if (userId === req.user.id) {
      return res.json({ areFriends: false, message: 'Không thể check với chính mình' });
    }

    const areFriends = await storage.friends.areFriends(req.user.id, userId);
    res.json({ areFriends });
  } catch (error) {
    console.error('Error checking friendship:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   POST /api/friends/request
// @desc    Gửi lời mời kết bạn
// @access  Private
router.post('/request', auth, async (req, res) => {
  try {
    const { toUserId } = req.body;
    console.log('📱 Friend request:', { fromUserId: req.user.id, toUserId });
    
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
    console.log('👥 Are friends check:', { fromUserId: req.user.id, toUserId, areFriends });
    if (areFriends) {
      return res.status(400).json({ message: 'Đã là bạn bè' });
    }

    // Check if request already exists
    const existingRequest = await storage.friendRequests.findByUsers(req.user.id, toUserId);
    console.log('📋 Existing request check:', { 
      fromUserId: req.user.id, 
      toUserId, 
      existingRequest: existingRequest ? {
        id: existingRequest.id,
        fromUserId: existingRequest.fromUserId,
        toUserId: existingRequest.toUserId,
        status: existingRequest.status
      } : null 
    });
    
    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        console.log('❌ Pending request exists');
        return res.status(400).json({ message: 'Đã gửi lời mời kết bạn' });
      }
      if (existingRequest.status === 'accepted') {
        console.log('❌ Accepted request exists - should be friends');
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
    console.log('📋 Friends for user:', { userId: req.user.id, friendIds });
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
    
    const result = friends.filter(f => f !== null);
    console.log('📋 Friends result:', result.length, 'friends');
    res.json(result);
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

// @route   GET /api/friends/mutual/:userId
// @desc    Lấy danh sách bạn chung
// @access  Private
router.get('/mutual/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: 'userId là bắt buộc' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Không thể xem bạn chung với chính mình' });
    }

    // Check if target user exists
    const targetUser = await storage.users.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    // Get current user's friends
    const myFriendIds = await storage.friends.getFriends(req.user.id);

    // Get target user's friends
    const theirFriendIds = await storage.friends.getFriends(userId);

    // Find mutual friends (intersection of both friend lists)
    const mutualFriendIds = myFriendIds.filter(id => theirFriendIds.includes(id));

    // Get detailed info for mutual friends
    const mutualFriends = await Promise.all(
      mutualFriendIds.map(async (friendId) => {
        const friend = await storage.users.findById(friendId);
        return friend ? {
          id: friend.id,
          username: friend.username,
          fullName: friend.fullName,
          avatar: friend.avatar,
          isOnline: friend.isOnline || false
        } : null;
      })
    );

    res.json({
      mutualFriends: mutualFriends.filter(f => f !== null),
      count: mutualFriends.filter(f => f !== null).length
    });
  } catch (error) {
    console.error('Error getting mutual friends:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;

