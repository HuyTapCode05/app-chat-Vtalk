/**
 * Query Optimizer Utilities
 * Batch queries và optimize N+1 problems
 */

const storage = require('../storage/dbStorage');

/**
 * Batch load users by IDs (tránh N+1 queries)
 */
const batchLoadUsers = async (userIds) => {
  if (!userIds || userIds.length === 0) return [];
  
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return [];
  
  // Load all users at once
  const allUsers = await storage.users.getAllUsers();
  const userMap = new Map();
  
  allUsers.forEach(user => {
    userMap.set(user.id, user);
  });
  
  // Return users in the same order as requested
  return uniqueIds.map(id => userMap.get(id)).filter(Boolean);
};

/**
 * Batch populate conversations with participants
 */
const batchPopulateConversations = async (conversations) => {
  if (!conversations || conversations.length === 0) return [];
  
  // Collect all unique user IDs from all conversations
  const allUserIds = new Set();
  conversations.forEach(conv => {
    const participants = conv.participants || [];
    participants.forEach(p => {
      const userId = typeof p === 'object' ? (p._id || p.id) : p;
      if (userId) allUserIds.add(userId);
    });
  });
  
  // Batch load all users
  const users = await batchLoadUsers(Array.from(allUserIds));
  const userMap = new Map(users.map(u => [u.id, u]));
  
  // Populate each conversation
  return conversations.map(conv => {
    const participants = (conv.participants || []).map(p => {
      const userId = typeof p === 'object' ? (p._id || p.id) : p;
      return userMap.get(userId) || null;
    }).filter(Boolean);
    
    return {
      ...conv,
      _id: conv.id,
      participants
    };
  });
};

/**
 * Batch populate messages with senders
 */
const batchPopulateMessages = async (messages) => {
  if (!messages || messages.length === 0) return [];
  
  // Collect all unique sender IDs
  const senderIds = [...new Set(messages.map(m => m.sender).filter(Boolean))];
  
  // Batch load all senders
  const senders = await batchLoadUsers(senderIds);
  const senderMap = new Map(senders.map(s => [s.id, s]));
  
  // Populate each message
  return messages.map(message => {
    const sender = senderMap.get(message.sender);
    if (sender) {
      return {
        ...message,
        sender: {
          _id: sender.id,
          id: sender.id,
          fullName: sender.fullName,
          username: sender.username,
          avatar: sender.avatar,
          isOnline: sender.isOnline || false,
        }
      };
    }
    return message;
  });
};

/**
 * Cache helper (simple in-memory cache)
 */
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCached = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCached = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

const clearCache = (pattern) => {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
};

module.exports = {
  batchLoadUsers,
  batchPopulateConversations,
  batchPopulateMessages,
  getCached,
  setCached,
  clearCache
};

