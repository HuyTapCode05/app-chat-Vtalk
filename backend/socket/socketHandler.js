const storage = require('../storage/dbStorage');
const { getOtherParticipants, getCurrentTimestamp } = require('../utils/helpers');
const { batchLoadUsers, batchPopulateMessages } = require('../utils/queryOptimizer');
const { verifyConversationMember, verifyUserRoomAccess } = require('../middleware/socketAuth');
const { notifyNewMessage, notifyIncomingCall } = require('../utils/pushNotification');
const pushTokenStorage = require('../storage/pushTokenStorage');
const eventThrottle = require('../utils/eventThrottle');
const batchProcessor = require('../utils/batchProcessor');
const sessionManager = require('../utils/sessionManager');

/**
 * Populate message with sender data (optimized with batch loading)
 */
const populateMessage = async (message) => {
  if (!message || !message.sender) return message;
  
  try {
    const senders = await batchLoadUsers([message.sender]);
    if (senders.length > 0) {
      const sender = senders[0];
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
  } catch (error) {
    console.error('Error populating message sender:', error);
  }
  
  return message;
};

const handleSocketConnection = (socket, io) => {
  console.log('✅ User connected:', socket.id);

  // User joins their personal room (hỗ trợ multiple devices)
  socket.on('join', async (data) => {
    // Use authenticated userId from socket (from middleware)
    const userId = socket.userId;
    if (!userId) {
      console.error('❌ Socket not authenticated');
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Verify user can access their own room
    try {
      await verifyUserRoomAccess(socket, userId);
    } catch (error) {
      socket.emit('error', { message: error.message });
      return;
    }

    const deviceInfo = typeof data === 'object' ? {
      platform: data.platform || 'unknown', // 'web', 'ios', 'android'
      userAgent: data.userAgent || '',
      deviceId: data.deviceId || socket.id
    } : {
      platform: 'unknown',
      deviceId: socket.id
    };

    // Join user room
    socket.join(`user_${userId}`);
    
    // Track session (multiple devices support)
    sessionManager.addSession(userId, socket.id, deviceInfo);
    
    const deviceCount = sessionManager.getDeviceCount(userId);
    console.log(`👤 User ${userId} joined from ${deviceInfo.platform} (Total devices: ${deviceCount})`);

    // Update user online status (only if first device)
    if (deviceCount === 1) {
      await storage.users.updateOnlineStatus(userId, true);
      
      // Notify others that user came online
      socket.broadcast.emit('user-online', { userId });
      console.log(`✅ User ${userId} is now online`);
    } else {
      // User already online from another device, just notify about new device
      console.log(`📱 User ${userId} connected from additional device (${deviceInfo.platform})`);
    }

    // Notify user about their active devices
    socket.emit('devices-updated', {
      deviceCount,
      devices: sessionManager.getUserDevices(userId)
    });
  });

  // User joins conversation room (với verification)
  socket.on('join-conversation', async (conversationId) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      // Verify user is member of conversation
      await verifyConversationMember(socket, conversationId);
      socket.join(`conversation_${conversationId}`);
      console.log(`✅ User ${socket.userId} joined conversation ${conversationId}`);
    } catch (error) {
      console.warn(`⚠️ User ${socket.userId} tried to join conversation ${conversationId} without permission`);
      socket.emit('error', { message: 'Not authorized to join this conversation' });
    }
  });

  // Leave conversation room
  socket.on('leave-conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
    console.log(`User left conversation ${conversationId}`);
  });

  // Send message
  socket.on('send-message', async (data) => {
    try {
      const { conversationId, senderId, content, type = 'text' } = data;

      console.log('📤 Received send-message:', { conversationId, senderId, content: content?.substring(0, 50), type });

      if (!conversationId || !senderId || !content) {
        console.error('❌ Missing required fields:', { conversationId, senderId, content });
        socket.emit('error', { message: 'Thiếu thông tin cần thiết' });
        return;
      }

      // Use authenticated userId (more secure than trusting client)
      const authenticatedUserId = socket.userId;
      if (!authenticatedUserId) {
        console.error('❌ Socket not authenticated');
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Verify senderId matches authenticated user (prevent spoofing)
      if (String(senderId) !== String(authenticatedUserId)) {
        console.error('❌ Sender ID mismatch:', { senderId, authenticatedUserId });
        socket.emit('error', { message: 'Sender ID does not match authenticated user' });
        return;
      }

      // Verify conversation exists and user is participant
      const conversation = await storage.conversations.findById(conversationId);
      if (!conversation) {
        console.error('❌ Conversation not found:', conversationId);
        socket.emit('error', { message: 'Conversation không tồn tại' });
        return;
      }

      // Verify user is member of conversation
      try {
        await verifyConversationMember(socket, conversationId);
      } catch (error) {
        console.warn(`⚠️ User ${authenticatedUserId} tried to send message to conversation ${conversationId} without permission`);
        socket.emit('error', { message: 'Not authorized to send messages to this conversation' });
        return;
      }

      let participants = (conversation.participants || []).filter(p => p); // Filter out null/undefined
      console.log('👥 Participants:', participants, 'Sender:', senderId, 'Conversation type:', conversation.type);
      
      // Auto-fix: If private conversation has only 1 participant, try to find the other one
      if (participants.length < 2 && conversation.type === 'private') {
        console.warn('⚠️ Private conversation has only 1 participant, attempting to fix...');
        
        // Strategy 1: Try to find other participant from messages in this conversation
        const messages = await storage.messages.loadMessages(conversationId);
        const allSenders = [...new Set(messages.map(m => m.sender).filter(s => s && s !== senderId))];
        
        if (allSenders.length > 0) {
          const otherParticipant = allSenders[0];
          console.log('🔧 Found other participant from messages:', otherParticipant);
          participants = [senderId, otherParticipant];
          
          // Update conversation with fixed participants
          await storage.conversations.update(conversationId, {
            participants: participants
          });
          console.log('✅ Fixed conversation participants:', participants);
        } else {
          // Strategy 2: Try to find from other conversations of this user
          const userConversations = await storage.conversations.getConversationsByUserId(senderId);
          const otherParticipants = new Set();
          
          for (const conv of userConversations) {
            if (conv.id !== conversationId && conv.type === 'private') {
              const convParticipants = (conv.participants || []).filter(p => p && p !== senderId);
              convParticipants.forEach(p => otherParticipants.add(p));
            }
          }
          
          if (otherParticipants.size > 0) {
            // Use the most recent conversation's other participant
            const otherParticipant = Array.from(otherParticipants)[0];
            console.log('🔧 Found other participant from other conversations:', otherParticipant);
            participants = [senderId, otherParticipant];
            
            await storage.conversations.update(conversationId, {
              participants: participants
            });
            console.log('✅ Fixed conversation participants:', participants);
          } else {
            // Strategy 3: Find any other user in the system (last resort)
            const allUsers = await storage.users.getAllUsers();
            const otherUser = allUsers.find(u => u.id && u.id !== senderId);
            
            if (otherUser) {
              console.log('🔧 Adding other user as participant (last resort):', otherUser.id);
              participants = [senderId, otherUser.id];
              await storage.conversations.update(conversationId, {
                participants: participants
              });
              console.log('✅ Fixed conversation participants:', participants);
            } else {
              console.error('❌ Cannot fix conversation: no other participants found', { 
                conversationId, 
                participants, 
                type: conversation.type,
                messageCount: messages.length
              });
              socket.emit('error', { 
                message: 'Cuộc trò chuyện không hợp lệ (thiếu người tham gia). Vui lòng tạo cuộc trò chuyện mới từ danh bạ.' 
              });
              return;
            }
          }
        }
      }
      
      if (!participants.includes(senderId)) {
        console.error('❌ User not in participants:', { senderId, participants });
        socket.emit('error', { message: 'Không có quyền gửi tin nhắn' });
        return;
      }

      // Check if sender is blocked by any participant or vice versa
      const otherParticipants = participants.filter(p => p && p !== senderId);
      for (const participantId of otherParticipants) {
        // Check if sender blocked participant
        const senderBlockedParticipant = await storage.blocks.isBlocked(senderId, participantId);
        // Check if participant blocked sender
        const participantBlockedSender = await storage.blocks.isBlocked(participantId, senderId);
        
        if (senderBlockedParticipant || participantBlockedSender) {
          console.warn('⚠️ Message blocked:', {
            senderId,
            participantId,
            senderBlockedParticipant,
            participantBlockedSender
          });
          socket.emit('error', { message: 'Không thể gửi tin nhắn. Người dùng đã bị chặn.' });
          return;
        }
      }

      // Create message
      const message = await storage.messages.create({
        conversation: conversationId,
        sender: senderId,
        content,
        type,
        readBy: []
      });

      console.log('✅ Message created:', message._id);

      // Update conversation
      await storage.conversations.update(conversationId, {
        lastMessage: message._id,
        lastMessageAt: new Date().toISOString()
      });

      // Populate message
      const populated = await populateMessage(message);
      
      // Ensure conversation ID is set correctly (as string, not object)
      const messageToEmit = {
        ...populated,
        conversation: conversationId // Ensure it's the ID string, not an object
      };
      
      console.log('✅ Message populated:', messageToEmit._id, 'Sender:', messageToEmit.sender?.id || messageToEmit.sender?._id, 'Conversation:', conversationId);

      // Emit to conversation room (for users currently viewing the conversation)
      io.to(`conversation_${conversationId}`).emit('new-message', messageToEmit);
      console.log('📢 Emitted new-message to conversation room:', conversationId);

      // Also emit to individual user rooms (for ALL devices of each user)
      // This ensures messages sync across all devices (web + mobile)
      console.log('📤 Sending to other participants:', otherParticipants);
      
      if (otherParticipants.length === 0) {
        console.warn('⚠️ No other participants to send message to!', {
          conversationId,
          allParticipants: participants,
          senderId
        });
      }
      
      // Get push tokens for offline notifications
      const pushTokens = await pushTokenStorage.getTokensByUserIds(otherParticipants);
      
      otherParticipants.forEach(async (participantId) => {
        if (participantId) {
          // Send to ALL devices of this user (web + mobile)
          const userSockets = sessionManager.getUserSockets(participantId);
          
          if (userSockets.length > 0) {
            // User is online, send via socket
            io.to(`user_${participantId}`).emit('new-message', messageToEmit);
            io.to(`user_${participantId}`).emit('conversation-updated', {
              conversationId,
              lastMessage: messageToEmit,
              lastMessageAt: new Date().toISOString()
            });
            console.log(`📢 Emitted to user ${participantId} (${userSockets.length} device(s))`);
          } else {
            // User is offline, send push notification
            const tokens = pushTokens[participantId] || [];
            if (tokens.length > 0) {
              const sender = messageToEmit.sender;
              const senderName = sender?.fullName || sender?.username || 'Ai đó';
              
              tokens.forEach(token => {
                notifyNewMessage(messageToEmit, senderName, null, token).catch(err => {
                  console.error('Error sending push notification:', err);
                });
              });
              console.log(`📱 Sent push notification to user ${participantId} (${tokens.length} device(s))`);
            }
          }
        }
      });

    } catch (error) {
      console.error('❌ Error sending message:', error);
      socket.emit('error', { message: 'Lỗi gửi tin nhắn: ' + error.message });
    }
  });

  // Typing indicator
  socket.on('typing', async (data) => {
    const { conversationId, userId, isTyping } = data;
    const authenticatedUserId = socket.userId;
    
    // Verify userId matches authenticated user
    if (String(userId) !== String(authenticatedUserId)) {
      return;
    }
    
    // Throttle typing indicator để tránh spam khi nhiều users
    eventThrottle.throttle(`typing_${conversationId}_${userId}`, () => {
      // Emit to conversation room
      socket.to(`conversation_${conversationId}`).emit('user-typing', {
        conversationId,
        userId,
        isTyping
      });
      
      // Also emit to individual user rooms if needed
      try {
        const conversation = storage.conversations.findById(conversationId);
        if (conversation) {
          conversation.then(conv => {
            if (conv) {
              const participants = (conv.participants || []).filter(p => p && p !== userId);
              participants.forEach(participantId => {
                if (participantId) {
                  io.to(`user_${participantId}`).emit('user-typing', {
                    conversationId,
                    userId,
                    isTyping
                  });
                }
              });
            }
          }).catch(err => console.error('Error in typing handler:', err));
        }
      } catch (error) {
        console.error('Error handling typing indicator:', error);
      }
    }, 100); // Throttle 100ms - chỉ emit tối đa 10 lần/giây
  });

  // Mark message as read
  socket.on('mark-read', async (data) => {
    try {
      const { messageId, userId, conversationId } = data;
      
      const message = await storage.messages.markMessageAsRead(messageId, conversationId, userId);
      if (!message) return;

      // Notify sender
      io.to(`conversation_${conversationId}`).emit('message-read', {
        messageId,
        userId
      });
    } catch (error) {
      console.error('Error marking read:', error);
    }
  });

  // Call handling
  socket.on('call-request', async (data) => {
    const { callId, fromUserId, toUserId, callType } = data;
    
    console.log(`📞 Call request: ${fromUserId} -> ${toUserId} (${callType})`);
    
    if (!toUserId || toUserId === 'undefined') {
      console.error('❌ Invalid toUserId in call-request:', toUserId);
      io.to(`user_${fromUserId}`).emit('call-error', {
        callId,
        message: 'Invalid recipient user ID'
      });
      return;
    }

    // Get recipient info for notification
    const recipient = await storage.users.findById(toUserId);
    const caller = await storage.users.findById(fromUserId);
    const callerName = caller?.fullName || caller?.username || 'Ai đó';
    
    // Check if recipient is online
    const recipientSockets = sessionManager.getUserSockets(toUserId);
    
    if (recipientSockets.length > 0) {
      // User is online, send via socket
      io.to(`user_${toUserId}`).emit('incoming-call', {
        callId,
        fromUserId,
        callType,
        timestamp: new Date().toISOString()
      });
    } else {
      // User is offline, send push notification
      const pushTokens = await pushTokenStorage.getTokensByUserId(toUserId);
      if (pushTokens.length > 0) {
        pushTokens.forEach(token => {
          notifyIncomingCall({
            callId,
            fromUserId,
            userName: callerName,
            callType
          }, token).catch(err => {
            console.error('Error sending call push notification:', err);
          });
        });
        console.log(`📱 Sent call push notification to user ${toUserId} (${pushTokens.length} device(s))`);
      }
    }
    
    // Also notify the caller that request was sent (optional)
    io.to(`user_${fromUserId}`).emit('call-request-sent', {
      callId,
      toUserId,
      callType,
      timestamp: new Date().toISOString()
    });
  });

  // WebRTC Signaling - Offer
  socket.on('webrtc-offer', (data) => {
    const { callId, offer, fromUserId, toUserId } = data;
    console.log(`📡 WebRTC offer from ${fromUserId} to ${toUserId}`);
    io.to(`user_${toUserId}`).emit('webrtc-offer', {
      callId,
      offer,
      fromUserId,
      timestamp: new Date().toISOString()
    });
  });

  // WebRTC Signaling - Answer
  socket.on('webrtc-answer', (data) => {
    const { callId, answer, fromUserId, toUserId } = data;
    console.log(`📡 WebRTC answer from ${fromUserId} to ${toUserId}`);
    io.to(`user_${toUserId}`).emit('webrtc-answer', {
      callId,
      answer,
      fromUserId,
      timestamp: new Date().toISOString()
    });
  });

  // WebRTC Signaling - ICE Candidate
  socket.on('webrtc-ice-candidate', (data) => {
    const { callId, candidate, fromUserId, toUserId } = data;
    io.to(`user_${toUserId}`).emit('webrtc-ice-candidate', {
      callId,
      candidate,
      fromUserId,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('call-accept', (data) => {
    const { callId, userId, fromUserId } = data;
    
    console.log(`✅ Call accepted: ${callId} by ${userId}`);
    
    // Notify caller that call was accepted
    if (fromUserId) {
      io.to(`user_${fromUserId}`).emit('call-accepted', {
        callId,
        userId,
        timestamp: new Date().toISOString()
      });
    } else {
      // Fallback: broadcast to all (less ideal)
      socket.broadcast.emit('call-accepted', {
        callId,
        userId,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('call-reject', (data) => {
    const { callId, userId, fromUserId } = data;
    
    console.log(`❌ Call rejected: ${callId} by ${userId}`);
    
    // Notify caller that call was rejected
    if (fromUserId) {
      io.to(`user_${fromUserId}`).emit('call-rejected', {
        callId,
        userId,
        timestamp: new Date().toISOString()
      });
    } else {
      // Fallback: broadcast to all (less ideal)
      socket.broadcast.emit('call-rejected', {
        callId,
        userId,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('call-end', (data) => {
    const { callId, userId, otherUserId } = data;
    
    console.log(`📴 Call ended: ${callId} by ${userId}`);
    
    // Notify other party that call ended
    if (otherUserId) {
      io.to(`user_${otherUserId}`).emit('call-ended', {
        callId,
        userId,
        timestamp: new Date().toISOString()
      });
    } else {
      // Fallback: broadcast to all (less ideal)
      socket.broadcast.emit('call-ended', {
        callId,
        userId,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('call-answer', (data) => {
    const { callId, userId } = data;
    
    // Notify recipient that call was answered
    socket.broadcast.emit('call-answered', {
      callId,
      userId,
      timestamp: new Date()
    });
    
    console.log(`Call answered: ${callId}`);
  });

  // Recall message
  socket.on('recall-message', async (data) => {
    try {
      const { messageId, conversationId, senderId } = data;
      
      console.log('🔄 Recalling message:', { messageId, conversationId, senderId });
      
      // Get conversation to find participants
      const conversation = await storage.conversations.findById(conversationId);
      if (!conversation) {
        console.error('❌ Conversation not found for recall:', conversationId);
        socket.emit('error', { message: 'Không tìm thấy cuộc trò chuyện' });
        return;
      }
      
      // Check if messageId is a temp message
      if (messageId && messageId.startsWith('temp_')) {
        console.error('❌ Cannot recall temp message:', messageId);
        socket.emit('error', { message: 'Không thể thu hồi tin nhắn đang được gửi' });
        return;
      }
      
      // Update message in storage
      const messages = await storage.messages.loadMessages(conversationId);
      const messageIndex = messages.findIndex(m => m._id === messageId);
      
      console.log('🔍 Looking for message:', {
        messageId,
        totalMessages: messages.length,
        found: messageIndex !== -1
      });
      
      if (messageIndex !== -1) {
        // Verify sender can only recall their own messages
        const message = messages[messageIndex];
        const messageSender = message.sender;
        
        console.log('🔍 Verifying recall permission:', {
          messageSender,
          senderId,
          match: messageSender === senderId
        });
        
        if (!senderId) {
          console.error('❌ senderId is missing in recall request');
          socket.emit('error', { message: 'Thiếu thông tin người gửi' });
          return;
        }
        
        if (messageSender !== senderId) {
          console.error('❌ User cannot recall other user\'s message:', {
            messageSender,
            senderId,
            messageId
          });
          socket.emit('error', { message: 'Bạn chỉ có thể thu hồi tin nhắn của chính mình' });
          return;
        }
        
        messages[messageIndex].recalled = true;
        messages[messageIndex].content = 'Tin nhắn đã được thu hồi';
        await storage.messages.saveMessages(conversationId, messages);
        
        console.log('✅ Message recalled, notifying all participants');
        
        const recallData = {
          messageId,
          conversationId
        };
        
        // Get participants
        const participants = (conversation.participants || []).filter(p => p);
        console.log('👥 Notifying participants:', participants);
        
        // Emit to conversation room (for users currently viewing the conversation)
        io.to(`conversation_${conversationId}`).emit('message-recalled', recallData);
        console.log('📢 Emitted message-recalled to conversation room:', conversationId);
        
        // Also emit to individual user rooms (for users not currently viewing)
        // This ensures messages are received even if user hasn't joined conversation room
        participants.forEach(participantId => {
          if (participantId) {
            io.to(`user_${participantId}`).emit('message-recalled', recallData);
            console.log('📢 Emitted message-recalled to user room:', participantId);
          }
        });
      } else {
        console.error('❌ Message not found for recall:', messageId);
        socket.emit('error', { message: 'Không tìm thấy tin nhắn' });
      }
    } catch (error) {
      console.error('❌ Error recalling message:', error);
      socket.emit('error', { message: 'Lỗi thu hồi tin nhắn: ' + error.message });
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log('❌ User disconnected:', socket.id);
    
    // Remove session
    const userId = sessionManager.removeSession(socket.id);
    
    if (userId) {
      const remainingDevices = sessionManager.getDeviceCount(userId);
      console.log(`📱 User ${userId} disconnected. Remaining devices: ${remainingDevices}`);
      
      // Only mark offline if no devices remain
      if (remainingDevices === 0) {
        await storage.users.updateOnlineStatus(userId, false);
        
        // Notify others that user went offline
        socket.broadcast.emit('user-offline', { userId });
        console.log(`✅ User ${userId} is now offline (all devices disconnected)`);
      } else {
        // User still has other devices connected
        console.log(`📱 User ${userId} still has ${remainingDevices} active device(s)`);
        
        // Notify remaining devices about device count change
        io.to(`user_${userId}`).emit('devices-updated', {
          deviceCount: remainingDevices,
          devices: sessionManager.getUserDevices(userId)
        });
      }
    }
  });

  // Handle explicit logout from one device
  socket.on('logout-device', async (data) => {
    const userId = sessionManager.getUserFromSocket(socket.id);
    if (!userId) return;

    console.log(`🚪 User ${userId} logging out from device ${socket.id}`);
    
    // Remove this specific session
    sessionManager.removeSession(socket.id);
    
    const remainingDevices = sessionManager.getDeviceCount(userId);
    
    // If this was the last device, mark offline
    if (remainingDevices === 0) {
      await storage.users.updateOnlineStatus(userId, false);
      socket.broadcast.emit('user-offline', { userId });
    } else {
      // Notify other devices
      io.to(`user_${userId}`).emit('devices-updated', {
        deviceCount: remainingDevices,
        devices: sessionManager.getUserDevices(userId)
      });
    }
    
    socket.emit('logout-success');
    socket.disconnect();
  });

  // Handle logout from all devices
  socket.on('logout-all-devices', async (data) => {
    const userId = sessionManager.getUserFromSocket(socket.id);
    if (!userId) return;

    console.log(`🚪 User ${userId} logging out from ALL devices`);
    
    // Get all sockets for this user
    const userSockets = sessionManager.getUserSockets(userId);
    
    // Disconnect all devices
    userSockets.forEach(socketId => {
      const userSocket = io.sockets.sockets.get(socketId);
      if (userSocket) {
        userSocket.emit('force-logout', { reason: 'Logged out from another device' });
        userSocket.disconnect();
      }
      sessionManager.removeSession(socketId);
    });
    
    // Mark offline
    await storage.users.updateOnlineStatus(userId, false);
    socket.broadcast.emit('user-offline', { userId });
    
    socket.emit('logout-all-success');
    socket.disconnect();
  });
};

module.exports = { handleSocketConnection };
