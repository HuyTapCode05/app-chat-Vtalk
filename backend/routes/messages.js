const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const storage = require('../storage/dbStorage');
const upload = require('../middleware/upload');
const { batchPopulateMessages, batchLoadUsers } = require('../utils/queryOptimizer');
const messagePagination = require('../utils/messagePagination');
const readReceiptBatch = require('../utils/readReceiptBatch');

const populateMessage = async (message) => {
  const senders = await batchLoadUsers([message.sender]);
  if (senders.length > 0) {
    return {
      ...message,
      sender: senders[0]
    };
  }
  return message;
};

router.get('/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { cursor, limit = 50, direction = 'backward' } = req.query;
    const limitNum = Math.min(parseInt(limit) || 50, 100); // Max 100 messages per request

    // Verify user is participant
    const conversation = await storage.conversations.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    const participants = conversation.participants || [];
    if (!participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    // Use cursor-based pagination (faster than offset)
    const result = await messagePagination.getMessages(conversationId, {
      limit: limitNum,
      cursor: cursor || null,
      direction: direction || 'backward'
    });

    // Batch populate all messages at once (optimized)
    const populated = await batchPopulateMessages(result.messages);

    res.json({
      messages: populated,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor, // For loading older messages
      prevCursor: result.prevCursor, // For loading newer messages
      total: result.total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.post('/upload/voice', auth, upload.single('voice'), async (req, res) => {
  try {
    const { conversationId, duration } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Không có file voice' });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    
    const messageData = {
      conversation: conversationId,
      sender: req.user.id,
      content: fileUrl,
      type: 'voice',
      duration: duration ? parseInt(duration) : null
    };
    
    const message = await storage.messages.create(messageData);
    const populated = await populateMessage(message);
    
    res.json(populated);
    
  } catch (error) {
    console.error('Voice upload error:', error);
    res.status(500).json({ 
      message: 'Lỗi server khi upload voice',
      error: error.message 
    });
  }
});

router.post('/', auth, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'voice', maxCount: 1 }
]), async (req, res) => {
  try {
    const { conversationId, content, type = 'text', duration } = req.body;
    let fileUrl = '';

    if (req.files) {
      const imageFile = req.files['image'] ? req.files['image'][0] : null;
      const voiceFile = req.files['voice'] ? req.files['voice'][0] : null;
      
      if (imageFile) {
        fileUrl = `/uploads/${imageFile.filename}`;
      } else if (voiceFile) {
        fileUrl = `/uploads/${voiceFile.filename}`;
      }
    }

    if (!conversationId) {
      return res.status(400).json({ message: 'conversationId là bắt buộc' });
    }

    const conversation = await storage.conversations.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    const participants = conversation.participants || [];
    if (!participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    const messageContent = (type === 'image' || type === 'voice') ? fileUrl : content;
    if (!messageContent) {
      return res.status(400).json({ message: 'Content hoặc file là bắt buộc' });
    }

    const messageData = {
      conversation: conversationId,
      sender: req.user.id,
      content: messageContent,
      type: req.files ? (req.files['voice'] ? 'voice' : 'image') : type,
      readBy: []
    };

    if (type === 'voice' && duration) {
      messageData.duration = parseInt(duration);
    }

    const message = await storage.messages.create(messageData);

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
// @desc    Đánh dấu message đã đọc (batched)
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) {
      return res.status(400).json({ message: 'conversationId là bắt buộc' });
    }

    // Use batched read receipt (non-blocking)
    readReceiptBatch.markAsRead(req.params.id, conversationId, req.user.id);
    
    // Return immediately (processing happens in background)
    res.json({ message: 'Đã đánh dấu đọc' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

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

    // Batch populate all matched messages at once (optimized)
    const populated = await batchPopulateMessages(matchedMessages);
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
