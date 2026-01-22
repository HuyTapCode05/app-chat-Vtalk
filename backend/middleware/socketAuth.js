/**
 * Socket Authentication Middleware
 * Verify JWT token từ socket handshake để bảo vệ rooms và prevent unauthorized access
 */

const jwt = require('jsonwebtoken');
const storage = require('../storage/dbStorage');

/**
 * Socket authentication middleware
 * Verify JWT token và attach userId to socket
 */
const socketAuth = async (socket, next) => {
  try {
    // Get token từ handshake (client gửi trong auth object)
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    
    if (!token) {
      console.error('❌ Socket connection rejected: No token provided');
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    if (!decoded || !decoded.userId) {
      console.error('❌ Socket connection rejected: Invalid token');
      return next(new Error('Authentication error: Invalid token'));
    }

    // Verify user exists in database
    const user = await storage.users.findById(decoded.userId);
    if (!user) {
      console.error('❌ Socket connection rejected: User not found');
      return next(new Error('Authentication error: User not found'));
    }

    // Attach userId và user info to socket
    socket.userId = decoded.userId;
    socket.user = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role || 'user'
    };

    console.log(`✅ Socket authenticated: User ${socket.userId} (${socket.user.fullName})`);
    next();
  } catch (error) {
    console.error('❌ Socket authentication error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Authentication error: Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'));
    }
    
    return next(new Error('Authentication error: ' + error.message));
  }
};

/**
 * Check if user is member of conversation before joining
 */
const verifyConversationMember = async (socket, conversationId) => {
  try {
    if (!socket.userId) {
      throw new Error('Socket not authenticated');
    }

    const conversation = await storage.conversations.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const participants = conversation.participants || [];
    const participantIds = participants.map(p => 
      typeof p === 'object' ? (p._id || p.id) : p
    );

    if (!participantIds.map(id => String(id)).includes(String(socket.userId))) {
      console.warn(`⚠️ User ${socket.userId} tried to join conversation ${conversationId} without permission`);
      throw new Error('Not a member of this conversation');
    }

    return true;
  } catch (error) {
    console.error('Error verifying conversation member:', error);
    throw error;
  }
};

/**
 * Check if user can access another user's room
 */
const verifyUserRoomAccess = async (socket, targetUserId) => {
  try {
    if (!socket.userId) {
      throw new Error('Socket not authenticated');
    }

    // User can only access their own room or if they're friends
    if (String(socket.userId) === String(targetUserId)) {
      return true;
    }

    // Check if they're friends
    const isFriend = await storage.friends.areFriends(socket.userId, targetUserId);
    if (!isFriend) {
      console.warn(`⚠️ User ${socket.userId} tried to access user ${targetUserId} room without permission`);
      throw new Error('Not authorized to access this user room');
    }

    return true;
  } catch (error) {
    console.error('Error verifying user room access:', error);
    throw error;
  }
};

module.exports = {
  socketAuth,
  verifyConversationMember,
  verifyUserRoomAccess
};

