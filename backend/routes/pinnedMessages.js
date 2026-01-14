const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const storage = require('../storage/dbStorage');

// @route   POST /api/pinned-messages
// @desc    Ghim tin nhắn
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { conversationId, messageId } = req.body;
    
    if (!conversationId || !messageId) {
      return res.status(400).json({ message: 'conversationId và messageId là bắt buộc' });
    }

    // Check if conversation exists and user is participant
    const conversation = await storage.conversations.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Cuộc trò chuyện không tồn tại' });
    }

    // Participants should already be parsed by dbStorage.findById, but ensure it's an array
    const participants = Array.isArray(conversation.participants) 
      ? conversation.participants 
      : [];
    
    if (!participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Không có quyền ghim tin nhắn trong cuộc trò chuyện này' });
    }

    // Check if message exists (load from JSON file)
    const messages = await storage.messages.loadMessages(conversationId);
    const message = messages.find(m => (m._id || m.id) === messageId);
    if (!message) {
      return res.status(404).json({ message: 'Tin nhắn không tồn tại' });
    }

    // Check if already pinned
    const isPinned = await storage.pinnedMessages.isPinned(conversationId, messageId);
    if (isPinned) {
      return res.status(400).json({ message: 'Tin nhắn đã được ghim' });
    }

    // Pin message
    const pinned = await storage.pinnedMessages.pinMessage(
      conversationId,
      messageId,
      req.user.id
    );

    res.status(201).json({ message: 'Đã ghim tin nhắn', pinned });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   DELETE /api/pinned-messages/:conversationId/:messageId
// @desc    Bỏ ghim tin nhắn
// @access  Private
router.delete('/:conversationId/:messageId', auth, async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    
    // Check if conversation exists and user is participant
    const conversation = await storage.conversations.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Cuộc trò chuyện không tồn tại' });
    }

    // Participants should already be parsed by dbStorage.findById, but ensure it's an array
    const participants = Array.isArray(conversation.participants) 
      ? conversation.participants 
      : [];
    
    if (!participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Không có quyền bỏ ghim tin nhắn' });
    }

    await storage.pinnedMessages.unpinMessage(conversationId, messageId);

    res.json({ message: 'Đã bỏ ghim tin nhắn' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/pinned-messages/:conversationId
// @desc    Lấy danh sách tin nhắn đã ghim trong cuộc trò chuyện
// @access  Private
router.get('/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // Check if conversation exists and user is participant
    const conversation = await storage.conversations.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Cuộc trò chuyện không tồn tại' });
    }

    // Participants should already be parsed by dbStorage.findById, but ensure it's an array
    const participants = Array.isArray(conversation.participants) 
      ? conversation.participants 
      : [];
    
    if (!participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Không có quyền xem tin nhắn đã ghim' });
    }

    // Get pinned messages
    const pinned = await storage.pinnedMessages.getPinnedMessages(conversationId);
    
    // Load actual messages
    const messages = await storage.messages.loadMessages(conversationId);
    const pinnedMessages = pinned.map(p => {
      const message = messages.find(m => (m._id || m.id) === p.messageId);
      return {
        ...p,
        message: message || null
      };
    }).filter(p => p.message !== null);
    
    res.json(pinnedMessages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;

