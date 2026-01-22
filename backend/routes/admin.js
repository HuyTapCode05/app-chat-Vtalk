const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const storage = require('../storage/dbStorage');
const { get, all, run } = require('../database/sqlite');

// @route   GET /api/admin/stats
// @desc    Lấy thống kê tổng quan
// @access  Admin
router.get('/stats', adminAuth, async (req, res) => {
  try {
    // Get total users
    const totalUsers = await get('SELECT COUNT(*) as count FROM users');
    
    // Get online users
    const onlineUsers = await get('SELECT COUNT(*) as count FROM users WHERE isOnline = 1');
    
    // Get total conversations
    const totalConversations = await get('SELECT COUNT(*) as count FROM conversations');
    
    // Get total messages (count JSON files in messages directory)
    const fs = require('fs');
    const path = require('path');
    const messagesDir = path.join(__dirname, '../data/messages');
    let totalMessages = 0;
    if (fs.existsSync(messagesDir)) {
      const files = fs.readdirSync(messagesDir);
      totalMessages = files.filter(f => f.endsWith('.json')).length;
    }
    
    // Get total posts
    const totalPosts = await get('SELECT COUNT(*) as count FROM posts');
    
    // Get total stories
    const totalStories = await get('SELECT COUNT(*) as count FROM stories WHERE expiresAt > datetime("now")');
    
    res.json({
      users: {
        total: totalUsers.count || 0,
        online: onlineUsers.count || 0,
        offline: (totalUsers.count || 0) - (onlineUsers.count || 0),
      },
      conversations: totalConversations.count || 0,
      messages: totalMessages,
      posts: totalPosts.count || 0,
      stories: totalStories.count || 0,
    });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/admin/users
// @desc    Lấy danh sách tất cả users với thông tin chi tiết
// @access  Admin
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT id, username, email, fullName, avatar, isOnline, lastSeen, role, emailVerified, createdAt FROM users';
    let params = [];
    
    if (search) {
      query += ' WHERE fullName LIKE ? OR username LIKE ? OR email LIKE ?';
      params = [`%${search}%`, `%${search}%`, `%${search}%`];
    }
    
    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const users = await all(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM users';
    let countParams = [];
    if (search) {
      countQuery += ' WHERE fullName LIKE ? OR username LIKE ? OR email LIKE ?';
      countParams = [`%${search}%`, `%${search}%`, `%${search}%`];
    }
    const totalResult = await get(countQuery, countParams);
    
    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult.count || 0,
        totalPages: Math.ceil((totalResult.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error getting admin users:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/admin/users/:id
// @desc    Lấy thông tin chi tiết một user
// @access  Admin
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await storage.users.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    
    // Get user's friends count
    const friendsCount = await get(
      'SELECT COUNT(*) as count FROM friends WHERE userId1 = ? OR userId2 = ?',
      [user.id, user.id]
    );
    
    // Get user's conversations count
    const conversations = await all('SELECT * FROM conversations');
    const userConversations = conversations.filter(conv => {
      const participants = JSON.parse(conv.participants || '[]');
      return participants.includes(user.id);
    });
    
    // Get user's posts count
    const postsCount = await get(
      'SELECT COUNT(*) as count FROM posts WHERE authorId = ?',
      [user.id]
    );
    
    res.json({
      ...user,
      stats: {
        friends: friendsCount.count || 0,
        conversations: userConversations.length,
        posts: postsCount.count || 0,
      },
    });
  } catch (error) {
    console.error('Error getting admin user details:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Cập nhật thông tin user (admin)
// @access  Admin
router.put('/users/:id', adminAuth, async (req, res) => {
  try {
    const { fullName, username, email, role, emailVerified } = req.body;
    const updates = {};
    
    if (fullName !== undefined) updates.fullName = fullName;
    if (username !== undefined) updates.username = username;
    if (email !== undefined) updates.email = email;
    if (role !== undefined) updates.role = role;
    if (emailVerified !== undefined) updates.emailVerified = emailVerified ? 1 : 0;
    
    const updatedUser = await storage.users.update(req.params.id, updates);
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user (admin):', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Xóa user (admin)
// @access  Admin
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Không thể xóa chính mình' });
    }
    
    // Delete user's data
    await run('DELETE FROM friends WHERE userId1 = ? OR userId2 = ?', [userId, userId]);
    await run('DELETE FROM friend_requests WHERE fromUserId = ? OR toUserId = ?', [userId, userId]);
    await run('DELETE FROM blocks WHERE blockerId = ? OR blockedId = ?', [userId, userId]);
    await run('DELETE FROM posts WHERE authorId = ?', [userId]);
    await run('DELETE FROM post_comments WHERE authorId = ?', [userId]);
    await run('DELETE FROM stories WHERE userId = ?', [userId]);
    await run('DELETE FROM email_verifications WHERE userId = ?', [userId]);
    
    // Delete user
    await run('DELETE FROM users WHERE id = ?', [userId]);
    
    res.json({ message: 'Đã xóa người dùng thành công' });
  } catch (error) {
    console.error('Error deleting user (admin):', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/admin/conversations
// @desc    Lấy danh sách tất cả conversations
// @access  Admin
router.get('/conversations', adminAuth, async (req, res) => {
  try {
    const conversations = await all('SELECT * FROM conversations ORDER BY createdAt DESC LIMIT 100');
    
    const conversationsWithDetails = conversations.map(conv => ({
      ...conv,
      participants: JSON.parse(conv.participants || '[]'),
      admins: JSON.parse(conv.admins || '[]'),
    }));
    
    res.json(conversationsWithDetails);
  } catch (error) {
    console.error('Error getting admin conversations:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/admin/posts
// @desc    Lấy danh sách tất cả posts
// @access  Admin
router.get('/posts', adminAuth, async (req, res) => {
  try {
    const posts = await all(
      `SELECT p.*, u.fullName as authorName, u.username as authorUsername 
       FROM posts p 
       JOIN users u ON p.authorId = u.id 
       ORDER BY p.createdAt DESC 
       LIMIT 100`
    );
    
    const postsWithLikes = posts.map(post => ({
      ...post,
      likes: JSON.parse(post.likes || '[]'),
    }));
    
    res.json(postsWithLikes);
  } catch (error) {
    console.error('Error getting admin posts:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;

