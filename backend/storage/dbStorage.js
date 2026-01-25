const { run, get, all } = require('../database/sqlite');
const fs = require('fs');
const path = require('path');

// Messages stored in JSON files (one file per conversation)
const MESSAGES_DIR = path.join(__dirname, '../data/messages');

// Ensure messages directory exists
if (!fs.existsSync(MESSAGES_DIR)) {
  fs.mkdirSync(MESSAGES_DIR, { recursive: true });
}

// ============ USERS ============
const userStorage = {
  async create(userData) {
    try {
      const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      await run(
        `INSERT INTO users (id, username, email, password, fullName, avatar, coverPhoto, isOnline, lastSeen, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          userData.username,
          userData.email,
          userData.password,
          userData.fullName || '',
          userData.avatar || null,
          userData.coverPhoto || null,
          0,
          now,
          now,
          now
        ]
      );

      const createdUser = await this.findById(id);
      if (!createdUser) {
        throw new Error('Failed to retrieve created user');
      }
      return createdUser;
    } catch (error) {
      console.error('Error creating user in database:', error);
      throw error;
    }
  },

  async findById(id) {
    const user = await get('SELECT * FROM users WHERE id = ?', [id]);
    if (user) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  },

  async findByEmail(email) {
    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (user) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  },

  async findByUsername(username) {
    const user = await get('SELECT * FROM users WHERE username = ?', [username]);
    if (user) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  },

  async findByEmailOrUsername(emailOrUsername) {
    const user = await get(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [emailOrUsername, emailOrUsername]
    );
    if (user) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  },

  async getAllUsers() {
    const users = await all('SELECT id, username, email, fullName, avatar, coverPhoto, isOnline, lastSeen, createdAt, updatedAt FROM users');
    return users;
  },

  async searchUsers(query) {
    const users = await all(
      `SELECT id, username, email, fullName, avatar, coverPhoto, isOnline, lastSeen, createdAt, updatedAt 
       FROM users 
       WHERE fullName LIKE ? OR username LIKE ? OR email LIKE ?`,
      [`%${query}%`, `%${query}%`, `%${query}%`]
    );
    return users;
  },

  async update(id, updates) {
    const setClause = [];
    const values = [];
    
    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== 'password') {
        setClause.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });
    
    if (setClause.length === 0) {
      return this.findById(id);
    }
    
    setClause.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await run(
      `UPDATE users SET ${setClause.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  },

  async updateOnlineStatus(id, isOnline) {
    await run(
      'UPDATE users SET isOnline = ?, lastSeen = ? WHERE id = ?',
      [isOnline ? 1 : 0, new Date().toISOString(), id]
    );
    return this.findById(id);
  },

  async updateEmailVerified(id, verified) {
    await run('UPDATE users SET emailVerified = ? WHERE id = ?', [
      verified ? 1 : 0,
      id
    ]);
    return this.findById(id);
  },

  async getPassword(id) {
    const user = await get('SELECT password FROM users WHERE id = ?', [id]);
    return user ? user.password : null;
  },
};

// ============ CONVERSATIONS ============
const conversationStorage = {
  async create(conversationData) {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    // Filter out null/undefined participants before saving
    const cleanParticipants = (conversationData.participants || []).filter(p => p);
    const type = conversationData.type || 'private';

    // Admins: for group, default admin is creator / first participant; for private, no admins
    const adminIds =
      type === 'group' && cleanParticipants.length > 0
        ? [cleanParticipants[0]]
        : [];
    
    console.log('💾 Saving conversation to DB:', {
      id,
      type,
      participants: cleanParticipants,
      admins: adminIds,
      originalParticipants: conversationData.participants
    });
    
    await run(
      `INSERT INTO conversations (id, type, name, participants, admins, lastMessage, lastMessageAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        type,
        conversationData.name || null,
        JSON.stringify(cleanParticipants),
        JSON.stringify(adminIds),
        conversationData.lastMessage || null,
        conversationData.lastMessageAt || null,
        now,
        now
      ]
    );

    return this.findById(id);
  },

  async findById(id) {
    const conv = await get('SELECT * FROM conversations WHERE id = ?', [id]);
    if (conv) {
      // Parse participants safely
      let participants = [];
      let admins = [];
      try {
        if (typeof conv.participants === 'string') {
          participants = JSON.parse(conv.participants || '[]');
        } else if (Array.isArray(conv.participants)) {
          participants = conv.participants;
        } else {
          participants = [];
        }
      } catch (error) {
        console.error('Error parsing participants in findById:', error, 'Raw participants:', conv.participants);
        // Try to handle comma-separated string or single user ID
        if (typeof conv.participants === 'string') {
          if (conv.participants.includes(',')) {
            participants = conv.participants.split(',').map(p => p.trim()).filter(p => p);
          } else if (conv.participants.trim()) {
            participants = [conv.participants.trim()];
          } else {
            participants = [];
          }
        } else {
          participants = [];
        }
      }

      // Parse admins safely (multi-admin support)
      try {
        if (typeof conv.admins === 'string') {
          admins = JSON.parse(conv.admins || '[]');
        } else if (Array.isArray(conv.admins)) {
          admins = conv.admins;
        } else {
          admins = [];
        }
      } catch (error) {
        console.error('Error parsing admins in findById:', error, 'Raw admins:', conv.admins);
        admins = [];
      }
      
      return {
        ...conv,
        participants: Array.isArray(participants) ? participants : [],
        admins: Array.isArray(admins) ? admins : []
      };
    }
    return null;
  },

  async findPrivateConversation(userId1, userId2) {
    const conversations = await all('SELECT * FROM conversations WHERE type = ?', ['private']);
    
    for (const conv of conversations) {
      const participants = JSON.parse(conv.participants || '[]');
      if (participants.includes(userId1) && participants.includes(userId2) && participants.length === 2) {
        return {
          ...conv,
          participants
        };
      }
    }
    return null;
  },

  async getConversationsByUserId(userId) {
    // Optimized: Use LIKE query with JSON array pattern (faster than loading all)
    // Note: SQLite doesn't have native JSON support, so we use LIKE as fallback
    // For better performance, we still load all but optimize the filtering
    const conversations = await all('SELECT * FROM conversations ORDER BY lastMessageAt DESC, createdAt DESC');
    
    const userConversations = conversations
      .map(conv => {
        try {
          return {
            ...conv,
            participants: JSON.parse(conv.participants || '[]'),
            admins: (() => {
              try {
                return JSON.parse(conv.admins || '[]');
              } catch (e) {
                return [];
              }
            })()
          };
        } catch (e) {
          return null;
        }
      })
      .filter(conv => {
        if (!conv) return false;
        // Fast check: convert to string for comparison
        const participants = conv.participants || [];
        return Array.isArray(participants) && participants.includes(userId);
      })
      .sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt) : new Date(a.createdAt);
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt) : new Date(b.createdAt);
        return bTime - aTime;
      });
    
    return userConversations;
  },

  async update(id, updates) {
    const setClause = [];
    const values = [];
    
    Object.keys(updates).forEach(key => {
      if (key === 'participants') {
        setClause.push('participants = ?');
        values.push(JSON.stringify(updates[key]));
      } else if (key === 'admins') {
        setClause.push('admins = ?');
        values.push(JSON.stringify(updates[key] || []));
      } else if (key !== 'id') {
        setClause.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });
    
    if (setClause.length === 0) return null;
    
    setClause.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await run(
      `UPDATE conversations SET ${setClause.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  },

  async delete(id) {
    await run('DELETE FROM conversations WHERE id = ?', [id]);
    
    // Also delete messages file if exists
    const messagesFilePath = path.join(MESSAGES_DIR, `${id}.json`);
    if (fs.existsSync(messagesFilePath)) {
      try {
        fs.unlinkSync(messagesFilePath);
      } catch (error) {
        console.error('Error deleting messages file:', error);
      }
    }
    
    return true;
  },
};

// ============ MESSAGES (JSON Files) ============
// Message cache để tránh đọc file nhiều lần
const messageCache = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds
const MAX_CACHE_SIZE = 100; // Max 100 conversations in cache

const messageStorage = {
  getMessagesFilePath(conversationId) {
    return path.join(MESSAGES_DIR, `${conversationId}.json`);
  },

  async loadMessages(conversationId, useCache = true) {
    // Check cache first
    if (useCache) {
      const cached = messageCache.get(conversationId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
    }

    const filePath = this.getMessagesFilePath(conversationId);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    
    try {
      // Use async read for better performance
      const data = await fs.promises.readFile(filePath, 'utf8');
      const messages = JSON.parse(data);
      
      // Cache the result
      if (useCache) {
        // Clean cache if too large
        if (messageCache.size >= MAX_CACHE_SIZE) {
          const firstKey = messageCache.keys().next().value;
          messageCache.delete(firstKey);
        }
        messageCache.set(conversationId, {
          data: messages,
          timestamp: Date.now()
        });
      }
      
      return messages;
    } catch (error) {
      console.error('Error loading messages:', error);
      return [];
    }
  },

  async saveMessages(conversationId, messages) {
    const filePath = this.getMessagesFilePath(conversationId);
    
    // Use async write for better performance
    await fs.promises.writeFile(
      filePath, 
      JSON.stringify(messages, null, 2), 
      'utf8'
    );
    
    // Update cache
    if (messageCache.has(conversationId)) {
      messageCache.set(conversationId, {
        data: messages,
        timestamp: Date.now()
      });
    }
  },

  // Clear cache for a conversation
  clearCache(conversationId) {
    messageCache.delete(conversationId);
  },

  // Clear all cache
  clearAllCache() {
    messageCache.clear();
  },

  async create(messageData) {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const message = {
      _id: id,
      conversation: messageData.conversation,
      sender: messageData.sender,
      content: messageData.content,
      type: messageData.type || 'text',
      readBy: messageData.readBy || [],
      createdAt: now,
      updatedAt: now
    };

    // Add duration for voice messages
    if (messageData.duration) {
      message.duration = messageData.duration;
    }

    // Optimized: Load messages without cache (we're about to modify)
    const messages = await this.loadMessages(messageData.conversation, false);
    messages.push(message);
    
    // Limit messages per conversation to prevent file bloat (keep last 10,000)
    const MAX_MESSAGES = 10000;
    const trimmedMessages = messages.length > MAX_MESSAGES 
      ? messages.slice(-MAX_MESSAGES)
      : messages;
    
    await this.saveMessages(messageData.conversation, trimmedMessages);
    
    // Clear cache to force reload
    this.clearCache(messageData.conversation);

    return message;
  },

  async findById(messageId, conversationId) {
    const messages = await this.loadMessages(conversationId);
    return messages.find(m => m._id === messageId) || null;
  },

  async getMessagesByConversationId(conversationId, limit = 100, offset = 0) {
    const messages = await this.loadMessages(conversationId);
    
    // Optimize: only load what we need
    if (offset === 0 && limit >= messages.length) {
      return messages;
    }
    
    // Pagination: get last N messages
    const start = Math.max(0, messages.length - limit - offset);
    const end = messages.length - offset;
    return messages.slice(start, end);
  },

  async markMessageAsRead(messageId, conversationId, userId) {
    const messages = await this.loadMessages(conversationId);
    const messageIndex = messages.findIndex(m => m._id === messageId);
    
    if (messageIndex === -1) {
      return null;
    }
    
    const message = messages[messageIndex];
    const readBy = message.readBy || [];
    const alreadyRead = readBy.some(r => r.user === userId);
    
    if (!alreadyRead) {
      readBy.push({
        user: userId,
        readAt: new Date().toISOString()
      });
      message.readBy = readBy;
      
      // Use writeFileSync for faster write (small update)
      // But still update cache
      const filePath = this.getMessagesFilePath(conversationId);
      fs.writeFileSync(filePath, JSON.stringify(messages, null, 2), 'utf8');
      
      // Update cache
      if (messageCache.has(conversationId)) {
        messageCache.set(conversationId, {
          data: messages,
          timestamp: Date.now()
        });
      }
    }
    
    return message;
  },
};

// ============ POSTS ============
const postStorage = {
  async create(postData) {
    const id = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    await run(
      `INSERT INTO posts (id, authorId, content, image, likes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        postData.authorId,
        postData.content || null,
        postData.image || null,
        JSON.stringify(postData.likes || []),
        now,
        now
      ]
    );

    return this.findById(id);
  },

  async findById(id) {
    const post = await postStorage.getPostWithAuthor(id);
    return post;
  },

  async getPostWithAuthor(id) {
    const post = await get(
      `SELECT p.*, u.fullName as authorName, u.username as authorUsername, u.avatar as authorAvatar
       FROM posts p
       JOIN users u ON p.authorId = u.id
       WHERE p.id = ?`,
      [id]
    );
    
    if (post) {
      return {
        ...post,
        likes: JSON.parse(post.likes || '[]'),
        author: {
          _id: post.authorId,
          fullName: post.authorName,
          username: post.authorUsername,
          avatar: post.authorAvatar
        }
      };
    }
    return null;
  },

  async getPostsByUserId(userId, limit = 50) {
    const posts = await all(
      `SELECT p.*, u.fullName as authorName, u.username as authorUsername, u.avatar as authorAvatar
       FROM posts p
       JOIN users u ON p.authorId = u.id
       WHERE p.authorId = ?
       ORDER BY p.createdAt DESC
       LIMIT ?`,
      [userId, limit]
    );

    return posts.map(post => ({
      ...post,
      likes: JSON.parse(post.likes || '[]'),
      author: {
        _id: post.authorId,
        fullName: post.authorName,
        username: post.authorUsername,
        avatar: post.authorAvatar
      }
    }));
  },

  async update(id, updates) {
    const setClause = [];
    const values = [];
    
    Object.keys(updates).forEach(key => {
      if (key === 'likes') {
        setClause.push('likes = ?');
        values.push(JSON.stringify(updates[key]));
      } else if (key !== 'id') {
        setClause.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });
    
    if (setClause.length === 0) return null;
    
    setClause.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await run(
      `UPDATE posts SET ${setClause.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  },

  async delete(id) {
    // Delete post comments first
    await run('DELETE FROM post_comments WHERE postId = ?', [id]);
    // Delete post
    await run('DELETE FROM posts WHERE id = ?', [id]);
    return true;
  },
};

// ============ POST COMMENTS ============
const commentStorage = {
  async create(commentData) {
    const id = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    await run(
      `INSERT INTO post_comments (id, postId, authorId, content, createdAt)
       VALUES (?, ?, ?, ?, ?)`,
      [id, commentData.postId, commentData.authorId, commentData.content, now]
    );

    return this.findById(id);
  },

  async findById(id) {
    const comment = await get(
      `SELECT c.*, u.fullName as authorName, u.username as authorUsername, u.avatar as authorAvatar
       FROM post_comments c
       JOIN users u ON c.authorId = u.id
       WHERE c.id = ?`,
      [id]
    );
    
    if (comment) {
      return {
        ...comment,
        author: {
          _id: comment.authorId,
          fullName: comment.authorName,
          username: comment.authorUsername,
          avatar: comment.authorAvatar
        }
      };
    }
    return null;
  },

  async getCommentsByPostId(postId) {
    const comments = await all(
      `SELECT c.*, u.fullName as authorName, u.username as authorUsername, u.avatar as authorAvatar
       FROM post_comments c
       JOIN users u ON c.authorId = u.id
       WHERE c.postId = ?
       ORDER BY c.createdAt ASC`,
      [postId]
    );

    return comments.map(comment => ({
      ...comment,
      author: {
        _id: comment.authorId,
        fullName: comment.authorName,
        username: comment.authorUsername,
        avatar: comment.authorAvatar
      }
    }));
  },
};

// ============ FRIEND REQUESTS ============
const friendRequestStorage = {
  async create(requestData) {
    const id = `fr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    await run(
      `INSERT INTO friend_requests (id, fromUserId, toUserId, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        requestData.fromUserId,
        requestData.toUserId,
        requestData.status || 'pending',
        now,
        now
      ]
    );

    return this.findById(id);
  },

  async findById(id) {
    return await get('SELECT * FROM friend_requests WHERE id = ?', [id]);
  },

  async findByUsers(fromUserId, toUserId) {
    return await get(
      'SELECT * FROM friend_requests WHERE (fromUserId = ? AND toUserId = ?) OR (fromUserId = ? AND toUserId = ?)',
      [fromUserId, toUserId, toUserId, fromUserId]
    );
  },

  async getPendingRequests(userId) {
    return await all(
      'SELECT * FROM friend_requests WHERE toUserId = ? AND status = ? ORDER BY createdAt DESC',
      [userId, 'pending']
    );
  },

  async getSentRequests(userId) {
    return await all(
      'SELECT * FROM friend_requests WHERE fromUserId = ? AND status = ? ORDER BY createdAt DESC',
      [userId, 'pending']
    );
  },

  async update(id, updates) {
    const setClause = [];
    const values = [];
    
    Object.keys(updates).forEach(key => {
      if (key !== 'id') {
        setClause.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });
    
    if (setClause.length === 0) return null;
    
    setClause.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await run(
      `UPDATE friend_requests SET ${setClause.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  },

  async delete(id) {
    await run('DELETE FROM friend_requests WHERE id = ?', [id]);
  },
};

// ============ FRIENDS ============
const friendsStorage = {
  async addFriend(userId1, userId2) {
    const id = `friend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    // Ensure userId1 < userId2 for consistency
    const [id1, id2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
    
    await run(
      `INSERT INTO friends (id, userId1, userId2, createdAt)
       VALUES (?, ?, ?, ?)`,
      [id, id1, id2, now]
    );

    return this.findById(id);
  },

  async findById(id) {
    return await get('SELECT * FROM friends WHERE id = ?', [id]);
  },

  async areFriends(userId1, userId2) {
    const [id1, id2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
    const friend = await get(
      'SELECT * FROM friends WHERE userId1 = ? AND userId2 = ?',
      [id1, id2]
    );
    return !!friend;
  },

  async getFriends(userId) {
    const friends = await all(
      `SELECT * FROM friends WHERE userId1 = ? OR userId2 = ?`,
      [userId, userId]
    );
    
    // Extract friend IDs
    const friendIds = friends.map(f => f.userId1 === userId ? f.userId2 : f.userId1);
    return friendIds;
  },

  async removeFriend(userId1, userId2) {
    const [id1, id2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
    await run(
      'DELETE FROM friends WHERE userId1 = ? AND userId2 = ?',
      [id1, id2]
    );
  },
};

// ============ BLOCKS ============
const blocksStorage = {
  async blockUser(blockerId, blockedId) {
    try {
      const id = `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      console.log('🔴 blockUser: Inserting block', { id, blockerId, blockedId, now });
      await run(
        `INSERT INTO blocks (id, blockerId, blockedId, createdAt)
         VALUES (?, ?, ?, ?)`,
        [id, blockerId, blockedId, now]
      );

      const block = await this.findById(id);
      console.log('🔴 blockUser: Block created', block);
      if (!block) {
        throw new Error('Failed to retrieve created block');
      }
      return block;
    } catch (error) {
      console.error('❌ Error in blockUser:', error);
      // Check if it's a unique constraint violation
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
        throw new Error('Đã chặn người dùng này');
      }
      // Check if it's a foreign key constraint violation
      if (error.message && error.message.includes('FOREIGN KEY constraint failed')) {
        throw new Error('Người dùng không tồn tại');
      }
      throw error;
    }
  },

  async findById(id) {
    return await get('SELECT * FROM blocks WHERE id = ?', [id]);
  },

  async isBlocked(blockerId, blockedId) {
    const block = await get(
      'SELECT * FROM blocks WHERE blockerId = ? AND blockedId = ?',
      [blockerId, blockedId]
    );
    return !!block;
  },

  async getBlockedUsers(userId) {
    const blocks = await all(
      'SELECT * FROM blocks WHERE blockerId = ?',
      [userId]
    );
    return blocks.map(b => b.blockedId);
  },

  async unblockUser(blockerId, blockedId) {
    await run(
      'DELETE FROM blocks WHERE blockerId = ? AND blockedId = ?',
      [blockerId, blockedId]
    );
  },
};

// ============ NICKNAMES ============
const nicknamesStorage = {
  async setNickname(userId, targetUserId, nickname) {
    const id = `nickname_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    // Check if nickname already exists
    const existing = await this.getNickname(userId, targetUserId);
    
    if (existing) {
      await run(
        `UPDATE user_nicknames SET nickname = ?, updatedAt = ? WHERE userId = ? AND targetUserId = ?`,
        [nickname, now, userId, targetUserId]
      );
      return await this.getNickname(userId, targetUserId);
    } else {
      await run(
        `INSERT INTO user_nicknames (id, userId, targetUserId, nickname, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, userId, targetUserId, nickname, now, now]
      );
      return this.findById(id);
    }
  },

  async findById(id) {
    return await get('SELECT * FROM user_nicknames WHERE id = ?', [id]);
  },

  async getNickname(userId, targetUserId) {
    return await get(
      'SELECT * FROM user_nicknames WHERE userId = ? AND targetUserId = ?',
      [userId, targetUserId]
    );
  },

  async removeNickname(userId, targetUserId) {
    await run(
      'DELETE FROM user_nicknames WHERE userId = ? AND targetUserId = ?',
      [userId, targetUserId]
    );
  },

  async getNicknames(userId) {
    return await all(
      'SELECT * FROM user_nicknames WHERE userId = ?',
      [userId]
    );
  },
};

// ============ PINNED MESSAGES ============
const pinnedMessagesStorage = {
  async pinMessage(conversationId, messageId, pinnedBy) {
    const id = `pinned_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    await run(
      `INSERT INTO pinned_messages (id, conversationId, messageId, pinnedBy, createdAt)
       VALUES (?, ?, ?, ?, ?)`,
      [id, conversationId, messageId, pinnedBy, now]
    );

    return this.findById(id);
  },

  async findById(id) {
    return await get('SELECT * FROM pinned_messages WHERE id = ?', [id]);
  },

  async getPinnedMessages(conversationId) {
    return await all(
      'SELECT * FROM pinned_messages WHERE conversationId = ? ORDER BY createdAt DESC',
      [conversationId]
    );
  },

  async unpinMessage(conversationId, messageId) {
    await run(
      'DELETE FROM pinned_messages WHERE conversationId = ? AND messageId = ?',
      [conversationId, messageId]
    );
  },

  async isPinned(conversationId, messageId) {
    const pinned = await get(
      'SELECT * FROM pinned_messages WHERE conversationId = ? AND messageId = ?',
      [conversationId, messageId]
    );
    return !!pinned;
  },
};

// ============ CLOSE FRIENDS ============
const closeFriendsStorage = {
  async addCloseFriend(userId, friendId) {
    const id = `close_friend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    await run(
      `INSERT INTO close_friends (id, userId, friendId, createdAt)
       VALUES (?, ?, ?, ?)`,
      [id, userId, friendId, now]
    );

    return this.findById(id);
  },

  async findById(id) {
    return await get('SELECT * FROM close_friends WHERE id = ?', [id]);
  },

  async isCloseFriend(userId, friendId) {
    const closeFriend = await get(
      'SELECT * FROM close_friends WHERE userId = ? AND friendId = ?',
      [userId, friendId]
    );
    return !!closeFriend;
  },

  async getCloseFriends(userId) {
    const closeFriends = await all(
      'SELECT * FROM close_friends WHERE userId = ?',
      [userId]
    );
    return closeFriends.map(cf => cf.friendId);
  },

  async removeCloseFriend(userId, friendId) {
    await run(
      'DELETE FROM close_friends WHERE userId = ? AND friendId = ?',
      [userId, friendId]
    );
  },
};

// ============ PINNED CONVERSATIONS ============
const pinnedConversationsStorage = {
  async pinConversation(userId, conversationId) {
    const id = `pinned_conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    await run(
      `INSERT INTO pinned_conversations (id, userId, conversationId, createdAt)
       VALUES (?, ?, ?, ?)`,
      [id, userId, conversationId, now]
    );

    return this.findById(id);
  },

  async findById(id) {
    return await get('SELECT * FROM pinned_conversations WHERE id = ?', [id]);
  },

  async isPinned(userId, conversationId) {
    const pinned = await get(
      'SELECT * FROM pinned_conversations WHERE userId = ? AND conversationId = ?',
      [userId, conversationId]
    );
    return !!pinned;
  },

  async getPinnedConversations(userId) {
    return await all(
      'SELECT * FROM pinned_conversations WHERE userId = ? ORDER BY createdAt DESC',
      [userId]
    );
  },

  async unpinConversation(userId, conversationId) {
    await run(
      'DELETE FROM pinned_conversations WHERE userId = ? AND conversationId = ?',
      [userId, conversationId]
    );
  },
};

// ============ ARCHIVED CONVERSATIONS ============
const archivedConversationsStorage = {
  async archiveConversation(userId, conversationId) {
    const id = `archived_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    await run(
      `INSERT INTO archived_conversations (id, userId, conversationId, archivedAt)
       VALUES (?, ?, ?, ?)`,
      [id, userId, conversationId, now]
    );

    return this.findById(id);
  },

  async findById(id) {
    return await get('SELECT * FROM archived_conversations WHERE id = ?', [id]);
  },

  async isArchived(userId, conversationId) {
    const archived = await get(
      'SELECT * FROM archived_conversations WHERE userId = ? AND conversationId = ?',
      [userId, conversationId]
    );
    return !!archived;
  },

  async getArchivedConversations(userId) {
    return await all(
      'SELECT * FROM archived_conversations WHERE userId = ? ORDER BY archivedAt DESC',
      [userId]
    );
  },

  async unarchiveConversation(userId, conversationId) {
    await run(
      'DELETE FROM archived_conversations WHERE userId = ? AND conversationId = ?',
      [userId, conversationId]
    );
  },
};

// ============ MESSAGE REACTIONS ============
const messageReactionsStorage = {
  async addReaction(messageId, userId, reaction) {
    const id = `reaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    // Check if reaction already exists
    const existing = await this.getReaction(messageId, userId, reaction);
    if (existing) {
      return existing; // Already reacted
    }
    
    await run(
      `INSERT INTO message_reactions (id, messageId, userId, reaction, createdAt)
       VALUES (?, ?, ?, ?, ?)`,
      [id, messageId, userId, reaction, now]
    );

    return this.findById(id);
  },

  async findById(id) {
    return await get('SELECT * FROM message_reactions WHERE id = ?', [id]);
  },

  async getReaction(messageId, userId, reaction) {
    return await get(
      'SELECT * FROM message_reactions WHERE messageId = ? AND userId = ? AND reaction = ?',
      [messageId, userId, reaction]
    );
  },

  async getReactions(messageId) {
    return await all(
      'SELECT * FROM message_reactions WHERE messageId = ?',
      [messageId]
    );
  },

  async removeReaction(messageId, userId, reaction) {
    await run(
      'DELETE FROM message_reactions WHERE messageId = ? AND userId = ? AND reaction = ?',
      [messageId, userId, reaction]
    );
  },

  async removeAllReactions(messageId, userId) {
    await run(
      'DELETE FROM message_reactions WHERE messageId = ? AND userId = ?',
      [messageId, userId]
    );
  },
};

// ============ EMAIL VERIFICATIONS ============
const emailVerificationStorage = {
  async create(data) {
    const id = `verification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await run(
      `INSERT INTO email_verifications (id, userId, email, code, token, type, expiresAt, verified, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.userId,
        data.email,
        data.code || null,
        data.token || null,
        data.type || 'otp',
        data.expiresAt,
        0,
        new Date().toISOString()
      ]
    );
    return await this.findById(id);
  },

  async findById(id) {
    return await get('SELECT * FROM email_verifications WHERE id = ?', [id]);
  },

  async findByCode(code) {
    return await get('SELECT * FROM email_verifications WHERE code = ? AND verified = 0 AND expiresAt > datetime("now") ORDER BY createdAt DESC LIMIT 1', [code]);
  },

  async findByToken(token) {
    return await get('SELECT * FROM email_verifications WHERE token = ? AND verified = 0 AND expiresAt > datetime("now") ORDER BY createdAt DESC LIMIT 1', [token]);
  },

  async findByUserId(userId) {
    return await get('SELECT * FROM email_verifications WHERE userId = ? AND verified = 0 AND expiresAt > datetime("now") ORDER BY createdAt DESC LIMIT 1', [userId]);
  },

  async markAsVerified(id) {
    await run('UPDATE email_verifications SET verified = 1 WHERE id = ?', [id]);
    return await this.findById(id);
  },

  async deleteExpired() {
    await run('DELETE FROM email_verifications WHERE expiresAt < datetime("now") OR verified = 1');
  },
};

// ============ STORIES ============
const storiesStorage = {
  async create(storyData) {
    const id = `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now
    
    await run(
      `INSERT INTO stories (id, userId, type, content, mediaUrl, musicUrl, musicTitle, musicArtists, musicThumbnail, musicSource, backgroundColor, textColor, createdAt, expiresAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        storyData.userId,
        storyData.type,
        storyData.content || null,
        storyData.mediaUrl || null,
        storyData.musicUrl || null,
        storyData.musicTitle || null,
        storyData.musicArtists || null,
        storyData.musicThumbnail || null,
        storyData.musicSource || null,
        storyData.backgroundColor || null,
        storyData.textColor || null,
        now,
        expiresAt
      ]
    );

    return this.findById(id);
  },

  async findById(id) {
    const story = await get(
      `SELECT s.*, u.fullName, u.username, u.avatar
       FROM stories s
       JOIN users u ON s.userId = u.id
       WHERE s.id = ? AND s.expiresAt > datetime('now')`,
      [id]
    );
    
    if (story) {
      return {
        ...story,
        author: {
          id: story.userId,
          fullName: story.fullName,
          username: story.username,
          avatar: story.avatar
        }
      };
    }
    return null;
  },

  async getStoriesByUserId(userId) {
    const stories = await all(
      `SELECT * FROM stories 
       WHERE userId = ? AND expiresAt > datetime('now')
       ORDER BY createdAt DESC`,
      [userId]
    );
    return stories;
  },

  async getFriendsStories(userId) {
    // Get friend IDs
    const friendIds = await friendsStorage.getFriends(userId);
    
    if (friendIds.length === 0) {
      return [];
    }
    
    const placeholders = friendIds.map(() => '?').join(',');
    const stories = await all(
      `SELECT s.*, u.fullName, u.username, u.avatar,
              COUNT(sv.id) as viewsCount,
              MAX(CASE WHEN sv.viewerId = ? THEN 1 ELSE 0 END) as viewedByMe
       FROM stories s
       JOIN users u ON s.userId = u.id
       LEFT JOIN story_views sv ON s.id = sv.storyId
       WHERE s.userId IN (${placeholders}) AND s.expiresAt > datetime('now')
       GROUP BY s.id
       ORDER BY s.createdAt DESC`,
      [userId, ...friendIds]
    );
    
    return stories.map(story => ({
      ...story,
      author: {
        id: story.userId,
        fullName: story.fullName,
        username: story.username,
        avatar: story.avatar
      },
      viewsCount: story.viewsCount || 0,
      viewedByMe: story.viewedByMe === 1
    }));
  },

  async getUserStoriesWithViews(userId) {
    const stories = await all(
      `SELECT s.*, COUNT(sv.id) as viewsCount
       FROM stories s
       LEFT JOIN story_views sv ON s.id = sv.storyId
       WHERE s.userId = ? AND s.expiresAt > datetime('now')
       GROUP BY s.id
       ORDER BY s.createdAt DESC`,
      [userId]
    );
    
    return stories.map(story => ({
      ...story,
      viewsCount: story.viewsCount || 0
    }));
  },

  async deleteExpiredStories() {
    const result = await run(
      `DELETE FROM stories WHERE expiresAt <= datetime('now')`
    );
    return result.changes || 0;
  },

  async delete(id) {
    // Delete story views first
    await run('DELETE FROM story_views WHERE storyId = ?', [id]);
    // Delete story
    await run('DELETE FROM stories WHERE id = ?', [id]);
    return true;
  },
};

// ============ STORY VIEWS ============
const storyViewsStorage = {
  async addView(storyId, viewerId) {
    const id = `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    // Check if already viewed
    const existing = await this.getView(storyId, viewerId);
    if (existing) {
      return existing; // Already viewed
    }
    
    await run(
      `INSERT INTO story_views (id, storyId, viewerId, viewedAt)
       VALUES (?, ?, ?, ?)`,
      [id, storyId, viewerId, now]
    );

    return this.findById(id);
  },

  async findById(id) {
    return await get('SELECT * FROM story_views WHERE id = ?', [id]);
  },

  async getView(storyId, viewerId) {
    return await get(
      'SELECT * FROM story_views WHERE storyId = ? AND viewerId = ?',
      [storyId, viewerId]
    );
  },

  async getStoryViewers(storyId) {
    const views = await all(
      `SELECT sv.*, u.fullName, u.username, u.avatar
       FROM story_views sv
       JOIN users u ON sv.viewerId = u.id
       WHERE sv.storyId = ?
       ORDER BY sv.viewedAt DESC`,
      [storyId]
    );
    
    return views.map(view => ({
      ...view,
      viewer: {
        id: view.viewerId,
        fullName: view.fullName,
        username: view.username,
        avatar: view.avatar
      }
    }));
  },

  async getViewsCount(storyId) {
    const result = await get(
      'SELECT COUNT(*) as count FROM story_views WHERE storyId = ?',
      [storyId]
    );
    return result.count || 0;
  },
};

module.exports = {
  users: userStorage,
  conversations: conversationStorage,
  messages: messageStorage,
  posts: postStorage,
  comments: commentStorage,
  friendRequests: friendRequestStorage,
  friends: friendsStorage,
  blocks: blocksStorage,
  nicknames: nicknamesStorage,
  pinnedMessages: pinnedMessagesStorage,
  closeFriends: closeFriendsStorage,
  pinnedConversations: pinnedConversationsStorage,
  archivedConversations: archivedConversationsStorage,
  messageReactions: messageReactionsStorage,
  emailVerifications: emailVerificationStorage,
  stories: storiesStorage,
  storyViews: storyViewsStorage,
  // Export message cache for memory manager
  messageCache: messageCache,
};

