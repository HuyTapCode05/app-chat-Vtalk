import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

export const useChatSocket = (conversation, user) => {
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (socket && conversation) {
      const conversationId = conversation._id || conversation.id;

      // Initial setup: join conversation
      socket.emit('join-conversation', conversationId);

      // Handlers
      const handleNewMessage = (message) => {
        const messageConvId = typeof message.conversation === 'string' 
          ? message.conversation 
          : (message.conversation?._id || message.conversation?.id);

        if (messageConvId?.toString() === conversationId.toString()) {
          setMessages((prev) => {
            const senderId = message.sender?._id || message.sender?.id || message.sender;
            const filtered = prev.filter(m => 
              !(m.isTemp && m.content === message.content && (m.sender?._id || m.sender?.id) === senderId)
            );
            if (filtered.some(m => m._id === message._id)) return filtered;
            return [...filtered, message];
          });
        }
      };

      const handleTyping = (data) => {
        if (data.conversationId === conversationId && data.userId !== user.id) {
          if (data.isTyping) {
            const typingUser = conversation.participants?.find(p => (p._id || p.id) === data.userId);
            const typingUserInfo = { id: data.userId, fullName: typingUser?.fullName || 'Ai đó' };
            
            setTypingUsers((prev) => {
              if (!prev.some(u => u.id === data.userId)) return [...prev, typingUserInfo];
              return prev;
            });

            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
              setTypingUsers((prev) => prev.filter(u => u.id !== data.userId));
            }, 3000);
          } else {
            setTypingUsers((prev) => prev.filter(u => u.id !== data.userId));
          }
        }
      };

      const handleMessageRecalled = (data) => {
        if (data.conversationId?.toString() === conversationId.toString()) {
          setMessages(prev =>
            prev.map(m =>
              m._id === data.messageId
                ? { ...m, recalled: true, content: 'Tin nhắn đã được thu hồi' }
                : m
            )
          );
        }
      };

      const handleMessageRead = (data) => {
        setMessages(prev =>
          prev.map(m => {
            if (m._id === data.messageId) {
              const readBy = m.readBy || [];
              const alreadyRead = readBy.some(r => (r.user || r.userId) === data.userId);
              if (!alreadyRead) {
                return { ...m, readBy: [...readBy, { user: data.userId, readAt: new Date().toISOString() }] };
              }
            }
            return m;
          })
        );
      };

      const handleAvatarUpdate = (data) => {
        setMessages(prev => prev.map(msg => {
          const senderId = msg.sender?._id || msg.sender?.id;
          if (senderId === data.userId) {
            return { ...msg, sender: { ...msg.sender, avatar: data.avatar } };
          }
          return msg;
        }));
      };

      // Register listeners
      socket.on('new-message', handleNewMessage);
      socket.on('user-typing', handleTyping);
      socket.on('message-recalled', handleMessageRecalled);
      socket.on('message-read', handleMessageRead);
      socket.on('user-avatar-updated', handleAvatarUpdate);

      // Cleanup
      return () => {
        socket.emit('leave-conversation', conversationId);
        socket.off('new-message', handleNewMessage);
        socket.off('user-typing', handleTyping);
        socket.off('message-recalled', handleMessageRecalled);
        socket.off('message-read', handleMessageRead);
        socket.off('user-avatar-updated', handleAvatarUpdate);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      };
    }
  }, [socket, conversation, user]);

  return { messages, setMessages, typingUsers };
};

