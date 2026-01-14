import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api, { BASE_URL } from '../config/api';
import { Ionicons } from '@expo/vector-icons';
import EmojiPicker from '../components/EmojiPicker';
import MessageMenu from '../components/MessageMenu';
import ChatMenu from '../components/ChatMenu';
import QuickReactions from '../components/QuickReactions';
import ContactMenu from '../components/ContactMenu';
import { getUserId, getConversationId, getMessageId, getUserDisplayName, getImageUrl, getFirstChar } from '../utils/helpers';
import { handleApiError } from '../utils/errorHandler';
import { REACTIONS, COLORS } from '../utils/constants';

// Header icon button that works on web and native
const HeaderIconButton = ({ onPress, style, children }) => {
  const handlePress = (e) => {
    console.log('🔘 Chat HeaderIconButton pressed', { hasEvent: !!e });
    onPress?.(e);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        {
          padding: 6,
          cursor: Platform.OS === 'web' ? 'pointer' : undefined,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
    >
      {children}
    </Pressable>
  );
};

const ChatScreen = ({ route, navigation }) => {
  const { conversation: initialConversation, conversationName } = route.params;
  const { user } = useAuth();
  const socket = useSocket();
  const [conversation, setConversation] = useState(initialConversation);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]); // Array of { id, fullName }
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [nicknames, setNicknames] = useState({}); // { userId: nickname }
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [messageReactions, setMessageReactions] = useState({}); // { messageId: { reaction: [userId] } }
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const [quickReactionsPosition, setQuickReactionsPosition] = useState(null);
  const [selectedMessageForReaction, setSelectedMessageForReaction] = useState(null);
  const [showChatHeaderMenu, setShowChatHeaderMenu] = useState(false);
  const [otherParticipantInfo, setOtherParticipantInfo] = useState(null);
  const [wallpaper, setWallpaper] = useState(null);
  const typingTimeoutRef = useRef(null);
  const flatListRef = useRef(null);

  // Update header title when nicknames or participant info change
  useEffect(() => {
    let title = conversationName || 'Chat';

    // Kiểm tra xem có phải nhóm không (theo type hoặc số lượng participants)
    const participants = conversation?.participants || [];
    const participantCount = Array.isArray(participants) ? participants.length : 0;
    const isGroupConversation = conversation?.type === 'group' || participantCount > 2;

    console.log('📝 Updating header title:', {
      conversationType: conversation?.type,
      participantCount,
      isGroupConversation,
      conversationName: conversation?.name,
      hasOtherParticipantInfo: !!otherParticipantInfo,
    });

    // Nhóm: luôn dùng tên nhóm, KHÔNG BAO GIỜ dùng nickname
    if (isGroupConversation) {
      title = conversation?.name || conversationName || 'Nhóm';
    } 
    // Chỉ áp dụng nickname cho chat riêng (2 người)
    else if (otherParticipantInfo && participantCount === 2) {
      // Normalize ID to string for consistent comparison
      const otherId = String(otherParticipantInfo._id || otherParticipantInfo.id || '');
      
      // Check nickname with normalized ID
      let nickname = null;
      if (otherId) {
        // Try exact match first
        nickname = nicknames[otherId];
        
        // If not found, try to find by comparing all keys as strings
        if (!nickname) {
          for (const [key, value] of Object.entries(nicknames)) {
            if (String(key) === otherId) {
              nickname = value;
              break;
            }
          }
        }
      }
      
      title =
        nickname ||
        otherParticipantInfo.fullName ||
        conversationName ||
        'Chat';
    }

    console.log('📝 Setting header title to:', title);
    navigation.setOptions({ title });
  }, [conversation?.type, conversation?.name, conversation?.participants, conversationName, otherParticipantInfo, nicknames, navigation]);

  useEffect(() => {
    console.log('🔎 showChatHeaderMenu changed:', {
      showChatHeaderMenu,
      hasOtherParticipantInfo: !!otherParticipantInfo,
      conversationType: conversation?.type,
    });
  }, [showChatHeaderMenu, otherParticipantInfo, conversation?.type]);

  useEffect(() => {
    if (conversation) {
      const conversationId = conversation._id || conversation.id;
      if (!conversationId) {
        console.error('❌ Conversation ID is missing!', conversation);
        Alert.alert('Lỗi', 'Không tìm thấy ID cuộc trò chuyện');
        return;
      }
      
      console.log('📱 Loading conversation:', conversationId);
      loadMessages(conversationId);
      loadNicknames();
      // Load wallpaper if exists
      if (conversation?.wallpaper) {
        setWallpaper(conversation.wallpaper);
      }
      if (socket) {
        console.log('🔌 Joining conversation:', conversationId);
        socket.emit('join-conversation', conversationId);
      }

      // Get other participant for profile view
      const currentUserId = user?.id || user?._id;
      const otherParticipant = conversation.participants?.find(
        (p) => {
          const pId = typeof p === 'string' ? p : (p._id || p.id);
          return pId && pId !== currentUserId;
        }
      );

      // Get other participant ID (can be string or object)
      const otherParticipantId = otherParticipant 
        ? (typeof otherParticipant === 'string' 
            ? otherParticipant 
            : (otherParticipant._id || otherParticipant.id))
        : null;
      
      const otherParticipantName = otherParticipant && typeof otherParticipant === 'object'
        ? (otherParticipant.fullName || 'User')
        : 'User';

      // Store other participant info for menu
      if (otherParticipant && typeof otherParticipant === 'object') {
        setOtherParticipantInfo({
          _id: otherParticipant._id || otherParticipant.id,
          id: otherParticipant._id || otherParticipant.id,
          fullName: otherParticipant.fullName || 'User',
          username: otherParticipant.username,
          avatar: otherParticipant.avatar,
        });
      } else if (otherParticipantId) {
        // If only ID is available, fetch full info
        api.get(`/users/${otherParticipantId}`)
          .then(res => {
            setOtherParticipantInfo({
              _id: res.data.id || res.data._id,
              id: res.data.id || res.data._id,
              fullName: res.data.fullName || 'User',
              username: res.data.username,
              avatar: res.data.avatar,
            });
          })
          .catch(err => {
            console.error('Error fetching other participant info:', err);
            setOtherParticipantInfo({
              _id: otherParticipantId,
              id: otherParticipantId,
              fullName: 'User',
            });
          });
      }

      // Set header right buttons
      if (otherParticipantId && currentUserId) {
        navigation.setOptions({
          headerRight: () => (
            <View style={{ flexDirection: 'row', marginRight: 8 }}>
              <HeaderIconButton
                style={{ marginRight: 12 }}
                onPress={() => {
                  if (!otherParticipantId || !currentUserId) {
                    console.error('❌ Cannot make call:', { otherParticipantId, currentUserId });
                    Alert.alert('Lỗi', 'Không thể thực hiện cuộc gọi. Vui lòng thử lại.');
                    return;
                  }
                  const callId = `call_${Date.now()}_${currentUserId}_${otherParticipantId}`;
                  console.log('📞 Making voice call:', { callId, fromUserId: currentUserId, toUserId: otherParticipantId });
                  
                  // Navigate first, then emit
                  navigation.navigate('Call', {
                    callType: 'voice',
                    userId: otherParticipantId,
                    userName: otherParticipantName,
                    userAvatar: otherParticipant && typeof otherParticipant === 'object' && otherParticipant.avatar 
                      ? `${BASE_URL}${otherParticipant.avatar}` 
                      : null,
                    callId,
                    isIncoming: false,
                  });
                  
                  // Emit call request after navigation
                  if (socket) {
                    socket.emit('call-request', {
                      callId,
                      fromUserId: currentUserId,
                      toUserId: otherParticipantId,
                      callType: 'voice'
                    });
                  } else {
                    console.error('❌ Socket not available for call');
                  }
                }}
              >
                <Ionicons name="call" size={24} color="#fff" />
              </HeaderIconButton>
              <HeaderIconButton
                style={{ marginRight: 12 }}
                onPress={() => {
                  if (!otherParticipantId || !currentUserId) {
                    console.error('❌ Cannot make call:', { otherParticipantId, currentUserId });
                    Alert.alert('Lỗi', 'Không thể thực hiện cuộc gọi. Vui lòng thử lại.');
                    return;
                  }
                  const callId = `call_${Date.now()}_${currentUserId}_${otherParticipantId}`;
                  console.log('📞 Making video call:', { callId, fromUserId: currentUserId, toUserId: otherParticipantId });
                  
                  // Navigate first, then emit
                  navigation.navigate('Call', {
                    callType: 'video',
                    userId: otherParticipantId,
                    userName: otherParticipantName,
                    userAvatar: otherParticipant && typeof otherParticipant === 'object' && otherParticipant.avatar 
                      ? `${BASE_URL}${otherParticipant.avatar}` 
                      : null,
                    callId,
                    isIncoming: false,
                  });
                  
                  // Emit call request after navigation
                  if (socket) {
                    socket.emit('call-request', {
                      callId,
                      fromUserId: currentUserId,
                      toUserId: otherParticipantId,
                      callType: 'video'
                    });
                  } else {
                    console.error('❌ Socket not available for call');
                  }
                }}
              >
                <Ionicons name="videocam" size={24} color="#fff" />
              </HeaderIconButton>
              <HeaderIconButton
                style={{ marginRight: 12 }}
                onPress={() => {
                  const targetUserId = otherParticipant._id || otherParticipant.id;
                  console.log('🔍 Navigating to PersonalPage with userId:', targetUserId);
                  console.log('   otherParticipant:', otherParticipant);
                  navigation.navigate('PersonalPage', {
                    userId: targetUserId,
                  });
                }}
              >
                <Ionicons name="person-circle-outline" size={28} color="#fff" />
              </HeaderIconButton>
              <HeaderIconButton
                onPress={() => {
                  const participantsArr = conversation.participants || [];
                  const participantCount = Array.isArray(participantsArr) ? participantsArr.length : 0;
                  const isGroupConversation = conversation.type === 'group' || participantCount > 2;

                  console.log('📋 Chat header 3-dots pressed', {
                    type: conversation.type,
                    participantCount,
                    isGroupConversation,
                  });

                  if (isGroupConversation) {
                    // Nhóm: mở menu cuộc trò chuyện (đổi chủ đề, xem nhóm chung, ...)
                    setShowChatMenu(true);
                  } else {
                    // Chat riêng: mở menu người dùng (biệt danh, chặn, hủy kết bạn, ...)
                    setShowChatHeaderMenu(true);
                  }
                }}
              >
                <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
              </HeaderIconButton>
            </View>
          ),
        });
      }
    }

    return () => {
      if (socket && conversation) {
        const conversationId = conversation._id || conversation.id;
        if (conversationId) {
          socket.emit('leave-conversation', conversationId);
        }
      }
    };
  }, [conversation, socket, user, navigation]);

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (message) => {
        const conversationId = conversation?._id || conversation?.id;
        // Handle both string and object conversation IDs
        const messageConvId = typeof message.conversation === 'string' 
          ? message.conversation 
          : (message.conversation?._id || message.conversation?.id || message.conversation);
        
        console.log('📨 New message received:', { 
          conversationId, 
          messageConvId, 
          messageId: message._id,
          sender: message.sender?._id || message.sender?.id || message.sender,
          conversationType: typeof message.conversation
        });
        
        // Check if message belongs to current conversation
        if (conversationId && messageConvId && messageConvId.toString() === conversationId.toString()) {
          console.log('✅ Adding message to list');
          setMessages((prev) => {
            // Remove any temp messages with same content from same sender
            const senderId = message.sender?._id || message.sender?.id || message.sender;
            const filtered = prev.filter(m => {
              const mSenderId = m.sender?._id || m.sender?.id || m.sender;
              return !(m.isTemp && m.content === message.content && mSenderId === senderId);
            });
            
            // Check if message already exists
            if (filtered.some(m => m._id === message._id)) {
              console.log('⚠️ Message already exists, skipping');
              return filtered;
            }
            return [...filtered, message];
          });
          scrollToBottom();
        } else {
          console.log('⚠️ Message conversation ID mismatch:', {
            expected: conversationId,
            received: messageConvId,
            messageId: message._id
          });
        }
      };

      const handleTyping = (data) => {
        const conversationId = conversation?._id || conversation?.id;
        if (data.conversationId === conversationId && data.userId !== user.id) {
          if (data.isTyping) {
            // Get typing user info from conversation participants
            const typingUser = conversation.participants?.find(
              (p) => {
                const pId = p._id || p.id || p;
                return pId === data.userId;
              }
            );
            
            const typingUserInfo = {
              id: data.userId,
              fullName: typingUser?.fullName || 'Ai đó'
            };
            
            setTypingUsers((prev) => {
              const existing = prev.find(u => u.id === data.userId);
              if (!existing) {
                return [...prev, typingUserInfo];
              }
              return prev;
            });
            
            // Clear typing after 3 seconds
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
              setTypingUsers((prev) => prev.filter(u => u.id !== data.userId));
            }, 3000);
          } else {
            setTypingUsers((prev) => prev.filter(u => u.id !== data.userId));
          }
        }
      };

      const handleMessageRecalled = (data) => {
        console.log('📨 Message recalled event received:', data);
        const conversationId = conversation?._id || conversation?.id;
        const messageConvId = data.conversationId;
        
        console.log('🔍 Comparing conversation IDs:', {
          current: conversationId,
          received: messageConvId,
          match: conversationId && messageConvId && messageConvId.toString() === conversationId.toString()
        });
        
        // Only update if it's for current conversation
        if (conversationId && messageConvId && messageConvId.toString() === conversationId.toString()) {
          console.log('✅ Updating message as recalled:', data.messageId);
          setMessages(prev => {
            const updated = prev.map(m =>
              m._id === data.messageId
                ? { ...m, recalled: true, content: 'Tin nhắn đã được thu hồi' }
                : m
            );
            console.log('📝 Messages after recall update:', updated.filter(m => m._id === data.messageId));
            return updated;
          });
        } else {
          console.log('⚠️ Message recalled for different conversation, ignoring:', {
            current: conversationId,
            received: messageConvId,
            messageId: data.messageId
          });
        }
      };

      const handleMessageRead = (data) => {
        // Update read status when other user reads our message
        setMessages(prev =>
          prev.map(m => {
            if (m._id === data.messageId) {
              const readBy = m.readBy || [];
              const alreadyRead = readBy.some(r => {
                const readUserId = typeof r === 'object' ? (r.user || r.userId) : r;
                return readUserId === data.userId;
              });
              
              if (!alreadyRead) {
                return {
                  ...m,
                  readBy: [...readBy, { user: data.userId, readAt: new Date().toISOString() }]
                };
              }
            }
            return m;
          })
        );
      };

      // Listen for avatar updates
      const handleAvatarUpdate = (data) => {
        const { userId, avatar } = data;
        console.log('📢 Received user-avatar-updated in Chat:', userId, avatar);
        
        // Update conversation participants
        setConversation(prev => {
          if (!prev) return prev;
          const updatedParticipants = prev.participants?.map(p => {
            const pId = typeof p === 'string' ? p : (p._id || p.id);
            if (pId === userId) {
              return typeof p === 'string' ? p : { ...p, avatar };
            }
            return p;
          });
          return { ...prev, participants: updatedParticipants };
        });

        // Update messages sender avatars
        setMessages(prev => prev.map(msg => {
          const senderId = typeof msg.sender === 'string' 
            ? msg.sender 
            : (msg.sender?._id || msg.sender?.id);
          if (senderId === userId) {
            return {
              ...msg,
              sender: typeof msg.sender === 'string' 
                ? msg.sender 
                : { ...msg.sender, avatar }
            };
          }
          return msg;
        }));
      };

      socket.on('new-message', handleNewMessage);
      socket.on('user-typing', handleTyping);
      socket.on('message-recalled', handleMessageRecalled);
      socket.on('message-read', handleMessageRead);
      socket.on('user-avatar-updated', handleAvatarUpdate);

      return () => {
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

  // Mark messages as read when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && socket && user && conversation) {
      const conversationId = conversation._id || conversation.id;
      // Mark new messages as read after a short delay
      const timer = setTimeout(() => {
        markMessagesAsRead(conversationId, messages);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [messages.length, socket, user, conversation]);

  const loadPinnedMessages = async (conversationId) => {
    try {
      const res = await api.get(`/pinned-messages/${conversationId}`);
      setPinnedMessages(res.data || []);
    } catch (error) {
      console.error('Error loading pinned messages:', error);
      setPinnedMessages([]);
    }
  };

  const loadNicknames = async () => {
    try {
      const res = await api.get('/nicknames');
      const nicknameMap = {};
      (res.data || []).forEach(nick => {
        if (nick.targetUserId) {
          // Normalize targetUserId to string for consistent key format
          const normalizedId = String(nick.targetUserId);
          nicknameMap[normalizedId] = nick.nickname;
        }
      });
      console.log('📝 Loaded nicknames:', nicknameMap);
      setNicknames(nicknameMap);
    } catch (error) {
      console.error('Error loading nicknames:', error);
    }
  };

  const loadMessageReactions = async (messages) => {
    try {
      const reactionsMap = {};
      for (const message of messages) {
        const messageId = message._id || message.id;
        if (messageId) {
          try {
            const res = await api.get(`/messages/${messageId}/reactions`);
            reactionsMap[messageId] = res.data || {};
          } catch (error) {
            // Message might not have reactions yet
            reactionsMap[messageId] = {};
          }
        }
      }
      setMessageReactions(reactionsMap);
    } catch (error) {
      console.error('Error loading message reactions:', error);
    }
  };

  const handleSearchMessages = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const conversationId = conversation?._id || conversation?.id;
      const res = await api.get(`/messages/search`, {
        params: { conversationId, query: searchQuery.trim() }
      });
      setSearchResults(res.data || []);
    } catch (error) {
      console.error('Error searching messages:', error);
      Alert.alert('Lỗi', 'Không thể tìm tin nhắn');
    }
  };

  const handleAddReaction = async (messageId, reaction) => {
    try {
      const res = await api.get(`/messages/${messageId}/reactions`);
      const currentReactions = res.data || {};
      const hasReacted = currentReactions[reaction]?.includes(user?.id || user?._id);
      
      if (hasReacted) {
        await api.delete(`/messages/${messageId}/reactions/${reaction}`);
      } else {
        await api.post(`/messages/${messageId}/reactions`, { reaction });
      }
      
      // Reload reactions
      const updatedRes = await api.get(`/messages/${messageId}/reactions`);
      setMessageReactions(prev => ({
        ...prev,
        [messageId]: updatedRes.data || {}
      }));
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  const handlePinMessage = async (messageId) => {
    try {
      const conversationId = conversation?._id || conversation?.id;
      if (!conversationId || !messageId) return;

      await api.post('/pinned-messages', {
        conversationId,
        messageId,
      });
      
      await loadPinnedMessages(conversationId);
      Alert.alert('Thành công', 'Đã ghim tin nhắn');
    } catch (error) {
      console.error('Error pinning message:', error);
      Alert.alert('Lỗi', 'Không thể ghim tin nhắn');
    }
  };

  const handleUnpinMessage = async (messageId) => {
    try {
      const conversationId = conversation?._id || conversation?.id;
      if (!conversationId || !messageId) return;

      await api.delete(`/pinned-messages/${conversationId}/${messageId}`);
      
      await loadPinnedMessages(conversationId);
      Alert.alert('Thành công', 'Đã bỏ ghim tin nhắn');
    } catch (error) {
      console.error('Error unpinning message:', error);
      Alert.alert('Lỗi', 'Không thể bỏ ghim tin nhắn');
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const res = await api.get(`/messages/${conversationId}`);
      setMessages(res.data);
      setTimeout(() => scrollToBottom(), 100);
      
      // Load pinned messages
      await loadPinnedMessages(conversationId);
      
      // Mark all unread messages as read when opening chat
      markMessagesAsRead(conversationId, res.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async (conversationId, messagesToMark) => {
    if (!socket || !user || !messagesToMark) return;
    
    // Find unread messages from other users
    const unreadMessages = messagesToMark.filter(msg => {
      const senderId = msg.sender?._id || msg.sender?.id || msg.sender;
      if (senderId === user.id) return false; // Skip own messages
      
      const readBy = msg.readBy || [];
      const alreadyRead = readBy.some(r => {
        const readUserId = typeof r === 'object' ? (r.user || r.userId) : r;
        return readUserId === user.id;
      });
      
      return !alreadyRead;
    });

    // Mark each unread message as read
    for (const message of unreadMessages) {
      try {
        if (socket) {
          socket.emit('mark-read', {
            messageId: message._id,
            userId: user.id,
            conversationId: conversationId
          });
        }
        
        // Also update locally
        setMessages(prev =>
          prev.map(m => {
            if (m._id === message._id) {
              const readBy = m.readBy || [];
              const alreadyRead = readBy.some(r => {
                const readUserId = typeof r === 'object' ? (r.user || r.userId) : r;
                return readUserId === user.id;
              });
              
              if (!alreadyRead) {
                return {
                  ...m,
                  readBy: [...readBy, { user: user.id, readAt: new Date().toISOString() }]
                };
              }
            }
            return m;
          })
        );
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleSend = () => {
    if (!socket || !conversation || !inputMessage.trim()) {
      console.warn('⚠️ Cannot send message:', { socket: !!socket, conversation: !!conversation, hasMessage: !!inputMessage.trim() });
      return;
    }
    
    const conversationId = conversation._id || conversation.id;
    if (!conversationId) {
      console.error('❌ Conversation ID is missing!');
      Alert.alert('Lỗi', 'Không tìm thấy ID cuộc trò chuyện');
      return;
    }
    
    if (!user || !user.id) {
      console.error('❌ User ID is missing!');
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
      return;
    }
    
    const messageContent = inputMessage.trim();
    console.log('📤 Sending message:', { 
      conversationId, 
      senderId: user.id, 
      contentLength: messageContent.length,
      type: 'text'
    });
    
    socket.emit('send-message', {
      conversationId: conversationId,
      senderId: user.id,
      content: messageContent,
      type: 'text',
    });
    
    // Optimistically add message to UI (will be replaced by server response)
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tempMessage = {
      _id: tempId,
      conversation: conversationId,
      sender: { _id: user.id, id: user.id, fullName: user.fullName },
      content: messageContent,
      type: 'text',
      createdAt: new Date().toISOString(),
      readBy: [],
      isTemp: true
    };
    setMessages((prev) => [...prev, tempMessage]);
    scrollToBottom();
    
    setInputMessage('');
    setShowEmojiPicker(false);
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Cần quyền truy cập thư viện ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const uploadImage = async (imageUri) => {
    setUploading(true);
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('image', {
        uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
        name: filename || 'image.jpg',
        type: type || 'image/jpeg',
      });
      const conversationId = conversation._id || conversation.id;
      if (!conversationId) {
        Alert.alert('Lỗi', 'Không tìm thấy ID cuộc trò chuyện');
        return;
      }
      formData.append('conversationId', conversationId);
      formData.append('type', 'image');

      const token = await storage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const message = await res.json();
        if (socket) {
          const conversationId = conversation._id || conversation.id;
          socket.emit('send-message', {
            conversationId: conversationId,
            senderId: user.id,
            content: message.content,
            type: 'image',
          });
        }
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Lỗi', 'Không thể gửi ảnh');
    } finally {
      setUploading(false);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setInputMessage((prev) => prev + emoji);
  };

  const handleMessageLongPress = (item, event) => {
    // Show quick reactions on long press
    setSelectedMessageForReaction(item);
    setQuickReactionsPosition({ 
      x: event.nativeEvent.pageX, 
      y: event.nativeEvent.pageY 
    });
    setShowQuickReactions(true);
    
    // Also show menu for other options
    setSelectedMessage(item);
    setMenuPosition({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
    setMenuVisible(true);
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage) return;

    Alert.alert(
      'Xóa tin nhắn',
      'Bạn có chắc chắn muốn xóa tin nhắn này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              // Xóa chỉ cho bên mình (delete for me)
              setMessages(prev => prev.filter(m => m._id !== selectedMessage._id));
              
              // Note: Message is only deleted locally for this user
              // Backend API for soft delete can be implemented if needed
              // await api.delete(`/messages/${selectedMessage._id}/delete-for-me`);
              
              setSelectedMessage(null);
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa tin nhắn');
            }
          },
        },
      ]
    );
  };

  const handleViewProfile = useCallback((userId) => {
    if (!userId) return;
    navigation.navigate('PersonalPage', { userId });
  }, [navigation]);

  const handleBlockUser = useCallback(async (userId, userName) => {
    if (!userId) return;
    
    Alert.alert(
      'Chặn người dùng',
      `Bạn có chắc chắn muốn chặn ${userName}? Bạn sẽ không nhận được tin nhắn từ họ.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Chặn',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/blocks', { blockedId: userId });
              Alert.alert('Thành công', 'Đã chặn người dùng');
              // Optionally navigate back or refresh conversation
            } catch (error) {
              handleApiError(error, 'Không thể chặn người dùng');
            }
          },
        },
      ]
    );
  }, []);

  const handleRecallMessage = async () => {
    if (!selectedMessage) return;

    // Check if this is a temp message (not yet saved to server)
    if (selectedMessage.isTemp || selectedMessage._id?.startsWith('temp_')) {
      Alert.alert('Thông báo', 'Tin nhắn đang được gửi, vui lòng đợi một chút trước khi thu hồi');
      return;
    }

    // Check if message is already recalled
    if (selectedMessage.recalled) {
      Alert.alert('Thông báo', 'Tin nhắn này đã được thu hồi');
      return;
    }

    Alert.alert(
      'Thu hồi tin nhắn',
      'Bạn có chắc chắn muốn thu hồi tin nhắn này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thu hồi',
          onPress: async () => {
            try {
              const conversationId = conversation._id || conversation.id;
              if (!conversationId) {
                Alert.alert('Lỗi', 'Không tìm thấy ID cuộc trò chuyện');
                return;
              }
              
              if (!user || (!user.id && !user._id)) {
                Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
                return;
              }
              
              // Get sender ID from user or from message
              const currentUserId = user.id || user._id;
              const messageSenderId = selectedMessage.sender?._id || selectedMessage.sender?.id || selectedMessage.sender;
              
              // Verify user is the sender
              if (currentUserId !== messageSenderId) {
                Alert.alert('Lỗi', 'Bạn chỉ có thể thu hồi tin nhắn của chính mình');
                return;
              }
              
              if (!socket) {
                Alert.alert('Lỗi', 'Không có kết nối đến server');
                return;
              }
              
              const recallData = {
                messageId: selectedMessage._id,
                conversationId: conversationId,
                senderId: currentUserId, // Include senderId for verification
              };
              
              console.log('🔄 Recalling message:', recallData);
              console.log('👤 User info:', { id: user.id, _id: user._id, currentUserId });
              console.log('📨 Message info:', {
                _id: selectedMessage._id,
                isTemp: selectedMessage.isTemp,
                recalled: selectedMessage.recalled,
                sender: messageSenderId
              });
              
              socket.emit('recall-message', recallData);
              
              // Optimistically update message to show "Đã thu hồi"
              // The server will broadcast to all participants
              setMessages(prev =>
                prev.map(m =>
                  m._id === selectedMessage._id
                    ? { ...m, recalled: true, content: 'Tin nhắn đã được thu hồi' }
                    : m
                )
              );
              
              setSelectedMessage(null);
              setMenuVisible(false);
            } catch (error) {
              console.error('Error recalling message:', error);
              Alert.alert('Lỗi', 'Không thể thu hồi tin nhắn');
            }
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }) => {
    const senderId = item.sender?._id || item.sender?.id || item.sender;
    const isOwn = senderId === user.id;
    const isImage = item.type === 'image';
    const isRecalled = item.recalled;
    
    return (
      <TouchableOpacity
        style={[
          styles.messageContainer,
          isOwn ? styles.ownMessage : styles.otherMessage,
        ]}
        onLongPress={(e) => handleMessageLongPress(item, e)}
        activeOpacity={0.7}
      >
        {!isOwn && (
          <View style={styles.avatar}>
            {item.sender?.avatar ? (
              <Image 
                source={{ uri: item.sender.avatar.startsWith('http') ? item.sender.avatar : `${BASE_URL}${item.sender.avatar}` }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {item.sender?.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            )}
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.ownBubble : styles.otherBubble,
          ]}
        >
          {!isOwn && (
            <Text style={styles.senderName}>
              {(() => {
                const senderId = String(item.sender?._id || item.sender?.id || item.sender || '');
                return nicknames[senderId] || item.sender?.fullName || 'User';
              })()}
            </Text>
          )}
          {isImage ? (
            <Image
              source={{ uri: `${BASE_URL}${item.content}` }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          ) : (
            <Text
              style={[
                styles.messageText,
                isOwn ? styles.ownMessageText : styles.otherMessageText,
                isRecalled && styles.recalledText,
              ]}
            >
              {isRecalled ? 'Tin nhắn đã được thu hồi' : item.content}
            </Text>
          )}
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
              {new Date(item.createdAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {/* Read Receipts - Status indicators: Đã gửi / Đã nhận / Đã xem */}
            {isOwn && (
              <View style={styles.readStatusContainer}>
                {(() => {
                  const readBy = item.readBy || [];
                  const otherParticipant = conversation.participants?.find(
                    (p) => {
                      const pId = p._id || p.id || p;
                      return pId !== user.id;
                    }
                  );
                  const otherParticipantId = otherParticipant?._id || otherParticipant?.id || otherParticipant;
                  const isReadByOther = otherParticipantId && readBy.some(r => {
                    const readUserId = typeof r === 'object' ? (r.user || r.userId) : r;
                    return readUserId === otherParticipantId;
                  });
                  
                  // 3 states: sent (single check), delivered (double check grey), read (double check green)
                  if (isReadByOther) {
                    // Đã xem - double check màu xanh + text
                    return (
                      <View style={styles.readStatusRow}>
                        <Ionicons
                          name="checkmark-done"
                          size={14}
                          color="#4CAF50"
                          style={styles.readIcon}
                        />
                        <Text style={styles.readStatusText}>Đã xem</Text>
                      </View>
                    );
                  } else if (readBy.length > 0) {
                    // Đã nhận - double check màu xám + text
                    return (
                      <View style={styles.readStatusRow}>
                        <Ionicons
                          name="checkmark-done"
                          size={14}
                          color="#999"
                          style={styles.readIcon}
                        />
                        <Text style={[styles.readStatusText, styles.readStatusTextGray]}>Đã nhận</Text>
                      </View>
                    );
                  } else {
                    // Đã gửi - single check màu xám + text
                    return (
                      <View style={styles.readStatusRow}>
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color="#999"
                          style={styles.readIcon}
                        />
                        <Text style={[styles.readStatusText, styles.readStatusTextGray]}>Đã gửi</Text>
                      </View>
                    );
                  }
                })()}
              </View>
            )}
          </View>
          
          {/* Message Reactions */}
          {messageReactions[item._id || item.id] && Object.keys(messageReactions[item._id || item.id]).length > 0 && (
            <View style={styles.reactionsContainer}>
              {Object.entries(messageReactions[item._id || item.id]).map(([reaction, userIds]) => (
                <TouchableOpacity
                  key={reaction}
                  style={[
                    styles.reactionBadge,
                    userIds.includes(user?.id || user?._id) && styles.reactionBadgeActive
                  ]}
                  onPress={() => handleAddReaction(item._id || item.id, reaction)}
                >
                  <Text style={styles.reactionEmoji}>{reaction}</Text>
                  {userIds.length > 0 && (
                    <Text style={styles.reactionCount}>{userIds.length}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00B14F" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      <View style={styles.messagesContainer}>
        {wallpaper && (
          <Image 
            source={{ uri: wallpaper.startsWith('http') ? wallpaper : `${BASE_URL}${wallpaper}` }}
            style={styles.wallpaperBackground}
            resizeMode="cover"
          />
        )}
        {/* Search Bar */}
        {showSearch && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm tin nhắn..."
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (text.trim()) {
                  handleSearchMessages();
                } else {
                  setSearchResults([]);
                }
              }}
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              onPress={() => {
                setShowSearch(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        {/* Search Results */}
        {showSearch && searchResults.length > 0 && (
          <View style={styles.searchResultsContainer}>
            <Text style={styles.searchResultsTitle}>
              Tìm thấy {searchResults.length} tin nhắn
            </Text>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => {
                    // Scroll to message
                    const messageIndex = messages.findIndex(m => (m._id || m.id) === (item._id || item.id));
                    if (messageIndex >= 0 && flatListRef.current) {
                      flatListRef.current.scrollToIndex({ index: messageIndex, animated: true });
                      setShowSearch(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }
                  }}
                >
                  <Text style={styles.searchResultText}>{item.content}</Text>
                  <Text style={styles.searchResultTime}>
                    {new Date(item.createdAt).toLocaleString('vi-VN')}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Pinned Messages Header */}
        {!showSearch && pinnedMessages.length > 0 && (
          <View style={styles.pinnedHeader}>
            <Ionicons name="pin" size={16} color="#00B14F" />
            <Text style={styles.pinnedHeaderText}>
              {pinnedMessages.length} tin nhắn đã ghim
            </Text>
            <TouchableOpacity
              onPress={() => {
                // Scroll to first pinned message
                const firstPinned = pinnedMessages[0];
                const messageId = firstPinned.message?._id || firstPinned.messageId;
                const messageIndex = messages.findIndex(m => (m._id || m.id) === messageId);
                if (messageIndex >= 0 && flatListRef.current) {
                  flatListRef.current.scrollToIndex({ index: messageIndex, animated: true });
                }
              }}
            >
              <Ionicons name="chevron-down" size={16} color="#00B14F" />
            </TouchableOpacity>
          </View>
        )}

        {!showSearch && (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={scrollToBottom}
          />
        )}
        
        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
              <View style={styles.typingDots}>
                <View style={[styles.typingDot, styles.typingDot1]} />
                <View style={[styles.typingDot, styles.typingDot2]} />
                <View style={[styles.typingDot, styles.typingDot3]} />
              </View>
              <Text style={styles.typingText}>
                {typingUsers.length === 1 
                  ? `${typingUsers[0].fullName || 'Ai đó'} đang soạn tin...`
                  : `${typingUsers.length} người đang soạn tin...`}
              </Text>
            </View>
          </View>
        )}
      </View>

      <EmojiPicker
        visible={showEmojiPicker}
        onEmojiSelect={handleEmojiSelect}
      />

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handlePickImage}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#00B14F" />
          ) : (
            <Ionicons name="image-outline" size={24} color="#00B14F" />
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Nhập tin nhắn..."
          value={inputMessage}
          onChangeText={(text) => {
            setInputMessage(text);
            // Emit typing indicator
            if (socket && conversation) {
              const conversationId = conversation._id || conversation.id;
              if (conversationId) {
                socket.emit('typing', {
                  conversationId: conversationId,
                  userId: user.id,
                  isTyping: text.length > 0,
                });
              }
            }
          }}
          multiline
          maxLength={500}
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          <Ionicons
            name="happy-outline"
            size={24}
            color={showEmojiPicker ? '#00B14F' : '#666'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSend}
          disabled={!inputMessage.trim()}
        >
          <Ionicons
            name="send"
            size={20}
            color={inputMessage.trim() ? '#fff' : '#ccc'}
          />
        </TouchableOpacity>
      </View>

      <MessageMenu
        visible={menuVisible}
        onClose={() => {
          setMenuVisible(false);
          setSelectedMessage(null);
        }}
        message={selectedMessage}
        isOwn={selectedMessage ? ((selectedMessage.sender?._id || selectedMessage.sender?.id || selectedMessage.sender) === (user?.id || user?._id)) : false}
        isPinned={selectedMessage && pinnedMessages.some(p => (p.message?._id || p.message?.id || p.messageId) === (selectedMessage._id || selectedMessage.id))}
        onDelete={handleDeleteMessage}
        onRecall={handleRecallMessage}
        onPin={() => {
          if (selectedMessage) {
            handlePinMessage(selectedMessage._id || selectedMessage.id);
          }
        }}
        onUnpin={() => {
          if (selectedMessage) {
            handleUnpinMessage(selectedMessage._id || selectedMessage.id);
          }
        }}
        onViewProfile={handleViewProfile}
        onBlockUser={handleBlockUser}
        currentUserId={user?.id || user?._id}
        position={menuPosition}
      />

      <ChatMenu
        visible={showChatMenu}
        onClose={() => setShowChatMenu(false)}
        conversation={conversation}
        currentUserId={user?.id || user?._id}
        onConversationUpdate={(updatedConversation) => {
          setConversation(updatedConversation);
        }}
        onWallpaperChange={(newWallpaper) => {
          setWallpaper(newWallpaper);
          setConversation(prev => ({ ...prev, wallpaper: newWallpaper }));
        }}
        onNameChange={(newName) => {
          setConversation(prev => ({ ...prev, name: newName }));
        }}
        onViewCommonGroups={async () => {
          // This is now handled in ChatMenu component
        }}
        onDissolve={() => {
          // Navigate back to conversations list after dissolving group
          navigation.goBack();
        }}
        onDelete={async () => {
          try {
            const conversationId = conversation?._id || conversation?.id;
            await api.delete(`/conversations/${conversationId}`);
            // Navigate back to conversations list after deleting
            navigation.goBack();
          } catch (error) {
            console.error('Error deleting conversation:', error);
            handleApiError(error, 'Không thể xóa cuộc trò chuyện');
          }
        }}
      />

      <QuickReactions
        visible={showQuickReactions}
        onClose={() => {
          setShowQuickReactions(false);
          setSelectedMessageForReaction(null);
        }}
        onReaction={async (reaction) => {
          if (selectedMessageForReaction) {
            await handleAddReaction(selectedMessageForReaction._id || selectedMessageForReaction.id, reaction);
          }
        }}
        position={quickReactionsPosition}
        messageReactions={messageReactions[selectedMessageForReaction?._id || selectedMessageForReaction?.id] || {}}
        currentUserId={user?.id || user?._id}
        messageId={selectedMessageForReaction?._id || selectedMessageForReaction?.id}
      />

      {/* Chat Header Menu - Menu quản lý người dùng (3 chấm trên header chat) - chỉ cho chat riêng */}
      {otherParticipantInfo && conversation?.type !== 'group' && Array.isArray(conversation?.participants) && conversation.participants.length <= 2 && (
        <ContactMenu
          visible={showChatHeaderMenu}
          onClose={() => setShowChatHeaderMenu(false)}
          user={otherParticipantInfo}
          currentUserId={user?.id || user?._id}
          conversationId={conversation?._id || conversation?.id}
          onUnfriend={async (userId) => {
            // API call already done in ContactMenu, just handle UI updates
            console.log('📋 onUnfriend callback called:', userId);
            setShowChatHeaderMenu(false);
            // Optionally refresh conversations list or navigate back
            // navigation.goBack();
          }}
          onBlock={async (userId) => {
            // API call already done in ContactMenu, just handle UI updates
            console.log('📋 onBlock callback called:', userId);
            setShowChatHeaderMenu(false);
            // Navigate back after blocking - navigate to MainTabs Messages screen
            navigation.navigate('MainTabs', { screen: 'Messages' });
          }}
          onSetNickname={async (userId, nickname) => {
            // API call already done in ContactMenu, just handle UI updates
            const trimmedNickname = nickname.trim();
            const normalizedUserId = String(userId);
            
            console.log('📝 onSetNickname callback called:', { 
              userId, 
              normalizedUserId,
              nickname: trimmedNickname,
            });
            
            // Cập nhật nicknames local để đổi tên header & bong bóng ngay
            setNicknames(prev => {
              const updated = {
                ...prev,
                [normalizedUserId]: trimmedNickname,
              };
              console.log('📝 Updated nicknames state:', updated);
              return updated;
            });
            
            setShowChatHeaderMenu(false);
          }}
          onDeleteConversation={async () => {
            // API call already done in ContactMenu, just handle navigation
            console.log('📋 onDeleteConversation callback called');
            setShowChatHeaderMenu(false);
            // Navigate back to conversations list after deleting
            // Use goBack first, then navigate to ensure refresh
            navigation.goBack();
            // Small delay to ensure navigation completes, then navigate to Messages tab
            setTimeout(() => {
              navigation.navigate('MainTabs', { screen: 'Messages' });
            }, 100);
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5E5E5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
    position: 'relative',
  },
  wallpaperBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
    zIndex: 0,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00B14F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
  },
  ownBubble: {
    backgroundColor: '#00B14F',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#333',
  },
  recalledText: {
    fontStyle: 'italic',
    color: '#999',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 10,
    opacity: 0.7,
  },
  ownMessageTime: {
    color: '#fff',
  },
  readIcon: {
    marginRight: 2,
  },
  readStatusContainer: {
    marginLeft: 4,
    marginTop: 2,
  },
  readStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readStatusText: {
    fontSize: 11,
    color: '#4CAF50',
    marginLeft: 2,
  },
  readStatusTextGray: {
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  iconButton: {
    padding: 8,
    marginRight: 4,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    marginRight: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00B14F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typingContainer: {
    padding: 8,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  typingDots: {
    flexDirection: 'row',
    marginRight: 8,
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#999',
    marginHorizontal: 2,
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },
  typingText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  pinnedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pinnedHeaderText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#00B14F',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    marginRight: 8,
  },
  searchResultsContainer: {
    backgroundColor: '#fff',
    maxHeight: 200,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchResultsTitle: {
    padding: 12,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchResultText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  searchResultTime: {
    fontSize: 12,
    color: '#999',
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  reactionBadgeActive: {
    backgroundColor: '#e3f2fd',
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
});

export default ChatScreen;
