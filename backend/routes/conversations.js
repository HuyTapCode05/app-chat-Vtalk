const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const storage = require('../storage/dbStorage');

// Helper: Populate conversation with user data
const populateConversation = async (conversation) => {
  const participants = await Promise.all(
    (conversation.participants || []).map(async (id) => {
      const user = await storage.users.findById(id);
      return user || null;
    })
  );
  const validParticipants = participants.filter(Boolean);

  let lastMessage = null;
  if (conversation.lastMessage) {
    const messages = await storage.messages.loadMessages(conversation.id);
    lastMessage = messages.find(m => m._id === conversation.lastMessage);
    if (lastMessage) {
      const sender = await storage.users.findById(lastMessage.sender);
      if (sender) {
        lastMessage.sender = sender;
      }
    }
  }

  // Normalize: Add _id for MongoDB compatibility
  return {
    ...conversation,
    _id: conversation.id, // Add _id for frontend compatibility
    participants: validParticipants,
    lastMessage
  };
};

// @route   GET /api/conversations
// @desc    Lấy danh sách conversations của user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const userConversations = await storage.conversations.getConversationsByUserId(req.user.id);
    
    // Auto-fix conversations with only 1 participant
    for (const conv of userConversations) {
      const participants = (conv.participants || []).filter(p => p);
      if (conv.type === 'private' && participants.length < 2) {
        console.warn('⚠️ Auto-fixing conversation with 1 participant:', conv.id);
        
        // Strategy 1: Try to find other participant from messages
        const messages = await storage.messages.loadMessages(conv.id);
        const allSenders = [...new Set(messages.map(m => m.sender).filter(s => s))];
        
        if (allSenders.length >= 2) {
          const fixedParticipants = allSenders.slice(0, 2);
          await storage.conversations.update(conv.id, {
            participants: fixedParticipants
          });
          console.log('✅ Fixed conversation from messages:', conv.id, 'participants:', fixedParticipants);
        } else {
          // Strategy 2: Try to find from other conversations of this user
          const otherConversations = userConversations.filter(c => c.id !== conv.id && c.type === 'private');
          const otherParticipants = new Set();
          
          for (const otherConv of otherConversations) {
            const otherConvParticipants = (otherConv.participants || []).filter(p => p && p !== req.user.id);
            otherConvParticipants.forEach(p => otherParticipants.add(p));
          }
          
          if (otherParticipants.size > 0) {
            // Use the first other participant found
            const fixedParticipants = [req.user.id, Array.from(otherParticipants)[0]];
            await storage.conversations.update(conv.id, {
              participants: fixedParticipants
            });
            console.log('✅ Fixed conversation from other conversations:', conv.id, 'participants:', fixedParticipants);
          } else {
            // Strategy 3: Find any other user (last resort)
            const allUsers = await storage.users.getAllUsers();
            const otherUser = allUsers.find(u => u.id && u.id !== req.user.id);
            
            if (otherUser) {
              const fixedParticipants = [req.user.id, otherUser.id];
              await storage.conversations.update(conv.id, {
                participants: fixedParticipants
              });
              console.log('✅ Fixed conversation with any other user (last resort):', conv.id, 'participants:', fixedParticipants);
            } else {
              console.warn('⚠️ Cannot fix conversation:', conv.id, '- no other users found');
            }
          }
        }
      }
    }
    
    // Reload conversations after fixes
    const fixedConversations = await storage.conversations.getConversationsByUserId(req.user.id);
    const populated = await Promise.all(fixedConversations.map(populateConversation));
    populated.sort((a, b) => {
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt) : new Date(0);
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt) : new Date(0);
      return timeB - timeA;
    });

    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});
// Update admin check in dissolve route to use multi-admin list
// (Keep route position the same to avoid breaking Express routing)

// @route   POST /api/conversations
// @desc    Tạo conversation mới
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { participantIds, type = 'private', name = '' } = req.body;
    
    if (!participantIds || participantIds.length === 0) {
      return res.status(400).json({ message: 'Cần ít nhất một người tham gia' });
    }

    // Check if private conversation already exists
    if (type === 'private' && participantIds.length === 1) {
      const existing = await storage.conversations.findPrivateConversation(
        req.user.id,
        participantIds[0]
      );

      if (existing) {
        const populated = await populateConversation(existing);
        return res.json(populated);
      }
    }

    // Filter out null/undefined/empty participants
    const validParticipantIds = participantIds.filter(id => {
      if (!id) return false;
      if (typeof id === 'string' && id.trim() === '') return false;
      return true;
    });
    
    console.log('📝 Creating conversation:', {
      userId: req.user.id,
      participantIds,
      validParticipantIds,
      type
    });
    
    // Combine and remove duplicates
    // IMPORTANT: req.user.id (người tạo) phải là participant đầu tiên để làm admin
    const allParticipants = [req.user.id, ...validParticipantIds].filter((id, index, self) => 
      id && self.indexOf(id) === index
    );
    
    // Đảm bảo người tạo luôn là participant đầu tiên (admin)
    if (allParticipants[0] !== req.user.id) {
      // Nếu không phải, đưa lên đầu
      const creatorIndex = allParticipants.indexOf(req.user.id);
      if (creatorIndex > 0) {
        allParticipants.splice(creatorIndex, 1);
        allParticipants.unshift(req.user.id);
      }
    }
    
    console.log('👥 All participants (creator is admin):', allParticipants);
    
    if (allParticipants.length < 2 && type === 'private') {
      console.error('❌ Cannot create private conversation with less than 2 participants');
      return res.status(400).json({ message: 'Cuộc trò chuyện riêng cần ít nhất 2 người' });
    }

    const conversation = await storage.conversations.create({
      participants: allParticipants,
      type,
      name
    });
    
    console.log('✅ Conversation created:', {
      id: conversation.id,
      participants: conversation.participants,
      type: conversation.type
    });

    const populated = await populateConversation(conversation);
    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   DELETE /api/conversations/:id/dissolve
// @desc    Giải tán nhóm (chỉ admin)
// @access  Private
router.delete('/:id/dissolve', auth, async (req, res) => {
  try {
    const conversation = await storage.conversations.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    if (conversation.type !== 'group') {
      return res.status(400).json({ message: 'Chỉ có thể giải tán nhóm' });
    }

    // Check if user is participant
    const participants = conversation.participants || [];
    
    // Handle both array of IDs and array of objects
    const participantIds = participants.map(p => 
      typeof p === 'object' ? (p._id || p.id) : p
    );
    
    if (!participantIds.includes(req.user.id)) {
      return res.status(403).json({ message: 'Không có quyền giải tán nhóm này' });
    }

    // Admins list (multi-admin support)
    let adminIds = Array.isArray(conversation.admins) ? conversation.admins : [];
    if (adminIds.length === 0 && participantIds.length > 0) {
      adminIds = [participantIds[0]];
    }
    const adminIdsStr = adminIds.map(id => String(id));
    const ownerId = adminIdsStr[0] || (participantIds[0] && String(participantIds[0]));

    // Only owner can dissolve group
    const isOwner = ownerId && String(req.user.id) === ownerId;
    if (!isOwner) {
      return res.status(403).json({ message: 'Chỉ trưởng nhóm mới có quyền giải tán nhóm' });
    }

    // Delete conversation (hard delete)
    await storage.conversations.delete(req.params.id);
    
    res.json({ message: 'Đã giải tán nhóm' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   DELETE /api/conversations/:id
// @desc    Xóa conversation
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const conversation = await storage.conversations.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    // Check if user is participant
    const participants = conversation.participants || [];
    if (!participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Không có quyền xóa conversation này' });
    }

    if (conversation.type === 'group') {
      // Nhóm: Xóa user khỏi participants (rời nhóm)
      const updatedParticipants = participants.filter(p => p !== req.user.id);
      
      if (updatedParticipants.length === 0) {
        // Nếu không còn ai, xóa luôn nhóm
        await storage.conversations.delete(req.params.id);
        return res.json({ message: 'Đã rời nhóm và xóa nhóm (không còn thành viên)' });
      }
      
      // Cập nhật participants
      await storage.conversations.update(req.params.id, {
        participants: updatedParticipants
      });
      
      return res.json({ message: 'Đã rời nhóm' });
    } else {
      // Chat riêng: Remove user khỏi participants (soft delete)
      // Khi GET conversations, sẽ tự động filter ra conversations mà user không còn trong participants
      const updatedParticipants = participants.filter(p => p !== req.user.id);
      
      if (updatedParticipants.length === 0) {
        // Nếu không còn ai, xóa luôn conversation
        await storage.conversations.delete(req.params.id);
        return res.json({ message: 'Đã xóa cuộc trò chuyện' });
      }
      
      // Cập nhật participants (remove user)
      await storage.conversations.update(req.params.id, {
        participants: updatedParticipants
      });
      
      return res.json({ message: 'Đã xóa cuộc trò chuyện' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   PUT /api/conversations/:id/topic
// @desc    Đổi chủ đề cuộc trò chuyện
// @access  Private
router.put('/:id/topic', auth, async (req, res) => {
  try {
    const { topic } = req.body;
    const conversation = await storage.conversations.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    // Check if user is participant
    const participants = conversation.participants || [];
    if (!participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Không có quyền thay đổi chủ đề' });
    }

    await storage.conversations.update(req.params.id, {
      name: topic || ''
    });

    const updated = await storage.conversations.findById(req.params.id);
    const populated = await populateConversation(updated);
    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   POST /api/conversations/:id/pin
// @desc    Ghim cuộc trò chuyện
// @access  Private
router.post('/:id/pin', auth, async (req, res) => {
  try {
    const conversation = await storage.conversations.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    // Check if user is participant
    const participants = conversation.participants || [];
    if (!participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Không có quyền ghim conversation này' });
    }

    const isPinned = await storage.pinnedConversations.isPinned(req.user.id, req.params.id);
    if (isPinned) {
      return res.status(400).json({ message: 'Đã ghim conversation này' });
    }

    await storage.pinnedConversations.pinConversation(req.user.id, req.params.id);
    res.json({ message: 'Đã ghim conversation' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   DELETE /api/conversations/:id/pin
// @desc    Bỏ ghim cuộc trò chuyện
// @access  Private
router.delete('/:id/pin', auth, async (req, res) => {
  try {
    await storage.pinnedConversations.unpinConversation(req.user.id, req.params.id);
    res.json({ message: 'Đã bỏ ghim conversation' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   POST /api/conversations/:id/archive
// @desc    Lưu trữ cuộc trò chuyện
// @access  Private
router.post('/:id/archive', auth, async (req, res) => {
  try {
    const conversation = await storage.conversations.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    // Check if user is participant
    const participants = conversation.participants || [];
    if (!participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Không có quyền lưu trữ conversation này' });
    }

    const isArchived = await storage.archivedConversations.isArchived(req.user.id, req.params.id);
    if (isArchived) {
      return res.status(400).json({ message: 'Đã lưu trữ conversation này' });
    }

    await storage.archivedConversations.archiveConversation(req.user.id, req.params.id);
    res.json({ message: 'Đã lưu trữ conversation' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   DELETE /api/conversations/:id/archive
// @desc    Bỏ lưu trữ cuộc trò chuyện
// @access  Private
router.delete('/:id/archive', auth, async (req, res) => {
  try {
    await storage.archivedConversations.unarchiveConversation(req.user.id, req.params.id);
    res.json({ message: 'Đã bỏ lưu trữ conversation' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/conversations/:id/common-groups
// @desc    Xem nhóm chung với user hiện tại
// @access  Private
router.get('/:id/common-groups', auth, async (req, res) => {
  try {
    const conversation = await storage.conversations.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    // Check if user is participant
    const participants = conversation.participants || [];
    if (!participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Không có quyền xem nhóm chung' });
    }

    // Get user ID from params (if viewing another user's profile)
    const targetUserId = req.query.userId || req.user.id;
    
    // Get all groups of current user
    const userConversations = await storage.conversations.getConversationsByUserId(req.user.id);
    const userGroups = userConversations.filter(c => c.type === 'group');
    
    // Get all groups of target user
    const targetUserConversations = await storage.conversations.getConversationsByUserId(targetUserId);
    const targetUserGroups = targetUserConversations.filter(c => c.type === 'group');
    
    // Find common groups
    const commonGroups = [];
    for (const userGroup of userGroups) {
      const isCommon = targetUserGroups.some(tg => tg.id === userGroup.id);
      if (isCommon) {
        const populated = await populateConversation(userGroup);
        commonGroups.push(populated);
      }
    }
    
    res.json(commonGroups);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   POST /api/conversations/:id/wallpaper
// @desc    Đổi ảnh nền cuộc trò chuyện
// @access  Private
const upload = require('../middleware/upload');
router.post('/:id/wallpaper', auth, upload.single('wallpaper'), async (req, res) => {
  try {
    const conversation = await storage.conversations.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    // Check if user is participant
    const participants = conversation.participants || [];
    if (!participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Không có quyền thay đổi ảnh nền' });
    }

    const wallpaperUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    await storage.conversations.update(req.params.id, {
      wallpaper: wallpaperUrl
    });

    const updated = await storage.conversations.findById(req.params.id);
    const populated = await populateConversation(updated);
    res.json({ wallpaper: wallpaperUrl, conversation: populated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   DELETE /api/conversations/:id/wallpaper
// @desc    Xóa ảnh nền cuộc trò chuyện
// @access  Private
router.delete('/:id/wallpaper', auth, async (req, res) => {
  try {
    const conversation = await storage.conversations.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    // Check if user is participant
    const participants = conversation.participants || [];
    if (!participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Không có quyền xóa ảnh nền' });
    }

    await storage.conversations.update(req.params.id, {
      wallpaper: null
    });

    res.json({ message: 'Đã xóa ảnh nền' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   PUT /api/conversations/:id/name
// @desc    Đổi tên nhóm (chỉ admin)
// @access  Private
router.put('/:id/name', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const conversation = await storage.conversations.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    if (conversation.type !== 'group') {
      return res.status(400).json({ message: 'Chỉ có thể đổi tên nhóm' });
    }

    // Check if user is participant
    const participants = conversation.participants || [];
    
    // Handle both array of IDs and array of objects
    const participantIds = participants.map(p => 
      typeof p === 'object' ? (p._id || p.id) : p
    );
    
    if (!participantIds.includes(req.user.id)) {
      return res.status(403).json({ message: 'Không có quyền đổi tên nhóm' });
    }

    // Admins list (multi-admin support)
    let adminIds = Array.isArray(conversation.admins) ? conversation.admins : [];
    if (adminIds.length === 0 && participantIds.length > 0) {
      adminIds = [participantIds[0]];
    }
    const adminIdsStr = adminIds.map(id => String(id));
    const ownerId = adminIdsStr[0] || (participantIds[0] && String(participantIds[0]));

    // Only owner can rename group
    const isOwner = ownerId && String(req.user.id) === ownerId;
    if (!isOwner) {
      return res.status(403).json({ message: 'Chỉ trưởng nhóm mới có quyền đổi tên nhóm' });
    }

    await storage.conversations.update(req.params.id, {
      name: name || ''
    });

    const updated = await storage.conversations.findById(req.params.id);
    const populated = await populateConversation(updated);
    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/conversations/:id/members
// @desc    Xem thành viên nhóm
// @access  Private
router.get('/:id/members', auth, async (req, res) => {
  try {
    const conversation = await storage.conversations.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    if (conversation.type !== 'group') {
      return res.status(400).json({ message: 'Chỉ áp dụng cho nhóm' });
    }

    // Check if user is participant
    const participants = conversation.participants || [];
    
    // Handle both array of IDs and array of objects
    const participantIds = participants.map(p => 
      typeof p === 'object' ? (p._id || p.id) : p
    );
    
    if (!participantIds.includes(req.user.id)) {
      return res.status(403).json({ message: 'Không có quyền xem thành viên' });
    }

    // Admins (multi-admin): stored on conversation.admins; fallback to first participant for legacy data
    let adminIds = Array.isArray(conversation.admins) ? conversation.admins : [];
    if (adminIds.length === 0 && participantIds.length > 0 && conversation.type === 'group') {
      adminIds = [participantIds[0]];
    }
    const adminIdsStr = adminIds.map(id => String(id));
    const ownerId = adminIdsStr[0] || (participantIds[0] && String(participantIds[0]));

    // Get all members with their info
    const members = await Promise.all(
      participantIds.map(async (userId) => {
        const user = await storage.users.findById(userId);
        if (!user) return null;
        
        const userIdStr = String(userId);
        const isOwner = ownerId && userIdStr === ownerId;
        const isAdmin = adminIdsStr.includes(userIdStr);
        const role = isOwner ? 'owner' : (isAdmin ? 'admin' : 'member');
        
        return {
          ...user,
          role,
          isOwner,
          isAdmin
        };
      })
    );

    res.json(members.filter(Boolean));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ⚠️ NOTE: This route must come AFTER more specific GET routes like
// /:id/common-groups and /:id/members to avoid route shadowing.
// @route   GET /api/conversations/:id
// @desc    Lấy thông tin 1 conversation (có populate)
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const conversation = await storage.conversations.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    // Check if user is participant
    const participants = conversation.participants || [];
    const participantIds = participants.map(p => 
      typeof p === 'object' ? (p._id || p.id) : p
    );

    if (!participantIds.map(id => String(id)).includes(String(req.user.id))) {
      return res.status(403).json({ message: 'Không có quyền xem cuộc trò chuyện này' });
    }

    const populated = await populateConversation(conversation);
    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   PUT /api/conversations/:id/promote/:userId
// @desc    Nâng member lên admin (key bạc -> key vàng)
// @access  Private
router.put('/:id/promote/:userId', auth, async (req, res) => {
  try {
    const conversation = await storage.conversations.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    if (conversation.type !== 'group') {
      return res.status(400).json({ message: 'Chỉ áp dụng cho nhóm' });
    }

    const participants = conversation.participants || [];
    const participantIds = participants.map(p => 
      typeof p === 'object' ? (p._id || p.id) : p
    );

    // Admins list
    let adminIds = Array.isArray(conversation.admins) ? conversation.admins : [];
    if (adminIds.length === 0 && participantIds.length > 0) {
      adminIds = [participantIds[0]];
    }
    const adminIdsStr = adminIds.map(id => String(id));
    const ownerId = adminIdsStr[0] || (participantIds[0] && String(participantIds[0]));

    // Check if current user is owner (chỉ chủ nhóm mới có quyền gỡ/giải tán/đổi tên)
    const isOwner = ownerId && String(req.user.id) === ownerId;
    if (!isOwner) {
      return res.status(403).json({ message: 'Chỉ trưởng nhóm mới có quyền gỡ quản trị viên khác' });
    }

    // Check if target user is participant
    const targetUserId = req.params.userId;
    if (!participantIds.map(id => String(id)).includes(String(targetUserId))) {
      return res.status(404).json({ message: 'Người dùng không phải thành viên nhóm' });
    }

    // Check if target user is already admin
    if (adminIdsStr.includes(String(targetUserId))) {
      return res.status(400).json({ message: 'Người dùng đã là quản trị viên' });
    }

    // Add target user to admins list (multi-admin)
    const newAdmins = [...adminIds, targetUserId];

    await storage.conversations.update(req.params.id, {
      admins: newAdmins
    });

    const updated = await storage.conversations.findById(req.params.id);
    const populated = await populateConversation(updated);
    res.json({ message: 'Đã nâng cấp thành quản trị viên', conversation: populated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   PUT /api/conversations/:id/transfer-admin/:userId
// @desc    Chuyển nhượng quyền quản trị (key vàng) cho member khác
// @access  Private
router.put('/:id/transfer-admin/:userId', auth, async (req, res) => {
  try {
    const conversation = await storage.conversations.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    if (conversation.type !== 'group') {
      return res.status(400).json({ message: 'Chỉ áp dụng cho nhóm' });
    }

    const participants = conversation.participants || [];
    const participantIds = participants.map(p => 
      typeof p === 'object' ? (p._id || p.id) : p
    );

    // Admins list
    let adminIds = Array.isArray(conversation.admins) ? conversation.admins : [];
    if (adminIds.length === 0 && participantIds.length > 0) {
      adminIds = [participantIds[0]];
    }
    const adminIdsStr = adminIds.map(id => String(id));

    // Check if current user is admin
    const isAdmin = adminIdsStr.includes(String(req.user.id));
    if (!isAdmin) {
      return res.status(403).json({ message: 'Chỉ quản trị viên mới có quyền chuyển nhượng' });
    }

    // Check if target user is participant
    const targetUserId = req.params.userId;
    if (!participantIds.map(id => String(id)).includes(String(targetUserId))) {
      return res.status(404).json({ message: 'Người dùng không phải thành viên nhóm' });
    }

    // Check if trying to transfer to self
    if (String(targetUserId) === String(req.user.id)) {
      return res.status(400).json({ message: 'Bạn đã là quản trị viên' });
    }

    // Ensure target is in admins list
    if (!adminIdsStr.includes(String(targetUserId))) {
      adminIds.push(targetUserId);
    }

    // Move target user to first position in admins (make them primary admin/owner)
    const newAdmins = [targetUserId, ...adminIds.filter(id => String(id) !== String(targetUserId))];

    await storage.conversations.update(req.params.id, {
      admins: newAdmins
    });

    const updated = await storage.conversations.findById(req.params.id);
    const populated = await populateConversation(updated);
    res.json({ message: 'Đã chuyển nhượng quyền quản trị', conversation: populated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   PUT /api/conversations/:id/demote/:userId
// @desc    Gỡ quyền quản trị viên (key vàng -> key bạc)
// @access  Private
router.put('/:id/demote/:userId', auth, async (req, res) => {
  try {
    const conversation = await storage.conversations.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    if (conversation.type !== 'group') {
      return res.status(400).json({ message: 'Chỉ áp dụng cho nhóm' });
    }

    const participants = conversation.participants || [];
    const participantIds = participants.map(p => 
      typeof p === 'object' ? (p._id || p.id) : p
    );

    // Admins list
    let adminIds = Array.isArray(conversation.admins) ? conversation.admins : [];
    if (adminIds.length === 0 && participantIds.length > 0) {
      adminIds = [participantIds[0]];
    }
    const adminIdsStr = adminIds.map(id => String(id));

    const targetUserId = req.params.userId;

    // Check if target user is admin
    if (!adminIdsStr.includes(String(targetUserId))) {
      return res.status(400).json({ message: 'Người dùng này không phải quản trị viên' });
    }

    // Prevent removing the last admin
    if (adminIdsStr.length === 1 && adminIdsStr[0] === String(targetUserId)) {
      return res.status(400).json({ message: 'Không thể gỡ quản trị viên cuối cùng của nhóm' });
    }

    const newAdmins = adminIds.filter(id => String(id) !== String(targetUserId));

    await storage.conversations.update(req.params.id, {
      admins: newAdmins
    });

    const updated = await storage.conversations.findById(req.params.id);
    const populated = await populateConversation(updated);
    res.json({ message: 'Đã gỡ quyền quản trị viên', conversation: populated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;
