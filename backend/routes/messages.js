const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const storage = require('../storage/dbStorage');
const upload = require('../middleware/upload');

// Helper: Populate message with sender data
const populateMessage = async (message) => {
  const sender = await storage.users.findById(message.sender);
  if (sender) {
    return {
      ...message,
      sender: sender
    };
  }
  return message;
};

// @route   GET /api/messages/:conversationId
// @desc    Lấy messages của một conversation
// @access  Private
router.get('/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify user is participant
    const conversation = await storage.conversations.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    const participants = conversation.participants || [];
    if (!participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    const allMessages = await storage.messages.getMessagesByConversationId(conversationId);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const messages = allMessages.slice(startIndex, endIndex);

    const populated = await Promise.all(messages.map(populateMessage));

    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   POST /api/messages
// @desc    Tạo message mới
// @access  Private
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { conversationId, content, type = 'text' } = req.body;
    let imageUrl = '';

    // Handle image upload
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    if (!conversationId) {
      return res.status(400).json({ message: 'conversationId là bắt buộc' });
    }

    // Verify user is participant
    const conversation = await storage.conversations.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    const participants = conversation.participants || [];
    if (!participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    const messageContent = type === 'image' ? imageUrl : content;
    if (!messageContent) {
      return res.status(400).json({ message: 'Content hoặc image là bắt buộc' });
    }

    const message = await storage.messages.create({
      conversation: conversationId,
      sender: req.user.id,
      content: messageContent,
      type: req.file ? 'image' : type,
      readBy: []
    });

    // Update conversation last message
    await storage.conversations.update(conversationId, {
      lastMessage: message._id,
      lastMessageAt: new Date().toISOString()
    });

    const populated = await populateMessage(message);

    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   PUT /api/messages/:id/read
// @desc    Đánh dấu message đã đọc
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) {
      return res.status(400).json({ message: 'conversationId là bắt buộc' });
    }

    await storage.messages.markMessageAsRead(req.params.id, conversationId, req.user.id);
    res.json({ message: 'Đã đánh dấu đọc' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/messages/search
// @desc    Tìm tin nhắn
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { conversationId, query } = req.query;
    
    if (!conversationId || !query) {
      return res.status(400).json({ message: 'conversationId và query là bắt buộc' });
    }

    // Verify user is participant
    const conversation = await storage.conversations.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    const participants = conversation.participants || [];
    if (!participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    const allMessages = await storage.messages.getMessagesByConversationId(conversationId);
    const searchQuery = query.toLowerCase();
    
    // Filter messages by content
    const matchedMessages = allMessages.filter(message => {
      if (message.type === 'image') return false; // Skip image messages
      const content = (message.content || '').toLowerCase();
      return content.includes(searchQuery);
    });

    const populated = await Promise.all(matchedMessages.map(populateMessage));
    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   POST /api/messages/:id/reactions
// @desc    Thêm cảm xúc nhanh
// @access  Private
router.post('/:id/reactions', auth, async (req, res) => {
  try {
    const { reaction } = req.body;
    const { id: messageId } = req.params;
    
    if (!reaction) {
      return res.status(400).json({ message: 'reaction là bắt buộc' });
    }

    // Valid reactions
    const validReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
    if (!validReactions.includes(reaction)) {
      return res.status(400).json({ message: 'Cảm xúc không hợp lệ' });
    }

    const reactionRecord = await storage.messageReactions.addReaction(
      messageId,
      req.user.id,
      reaction
    );

    res.status(201).json({ message: 'Đã thêm cảm xúc', reaction: reactionRecord });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   DELETE /api/messages/:id/reactions/:reaction
// @desc    Xóa cảm xúc nhanh
// @access  Private
router.delete('/:id/reactions/:reaction', auth, async (req, res) => {
  try {
    const { id: messageId, reaction } = req.params;
    
    await storage.messageReactions.removeReaction(messageId, req.user.id, reaction);
    res.json({ message: 'Đã xóa cảm xúc' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/messages/:id/reactions
// @desc    Lấy danh sách cảm xúc của tin nhắn
// @access  Private
router.get('/:id/reactions', auth, async (req, res) => {
  try {
    const { id: messageId } = req.params;
    
    const reactions = await storage.messageReactions.getReactions(messageId);
    
    // Group reactions by type
    const grouped = {};
    reactions.forEach(r => {
      if (!grouped[r.reaction]) {
        grouped[r.reaction] = [];
      }
      grouped[r.reaction].push(r.userId);
    });
    
    res.json(grouped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;
