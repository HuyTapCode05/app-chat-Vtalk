import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api, { BASE_URL } from '../config/api';
import { Ionicons } from '@expo/vector-icons';
import { getUserId, getConversationId, getUserDisplayName, getImageUrl, getFirstChar } from '../utils/helpers';
import { COLORS, SHADOWS, RADIUS } from '../utils/constants';
import { handleApiError } from '../utils/errorHandler';
import notificationService from '../utils/notificationService';

const ConversationsScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const socket = useSocket(); // Can be null
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedConversations, setPinnedConversations] = useState([]);
  const [archivedConversations, setArchivedConversations] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [nicknames, setNicknames] = useState({});

  useEffect(() => {
    loadConversations();
    loadPinnedAndArchived();
    loadNicknames();
  }, []);

  // Refresh when screen comes into focus (e.g., after deleting conversation)
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 ConversationsScreen focused, refreshing...');
      loadConversations();
      loadNicknames();
    }, [])
  );

  const loadPinnedAndArchived = async () => {
    try {
      // Initialize empty arrays - pin/archive status will be checked when needed
      setPinnedConversations([]);
      setArchivedConversations([]);
    } catch (error) {
      console.error('Error loading pinned/archived:', error);
    }
  };

  const loadNicknames = async () => {
    try {
      const res = await api.get('/nicknames');
      const nicknameMap = {};
      (res.data || []).forEach(nick => {
        if (nick.targetUserId) {
          const normalizedId = String(nick.targetUserId);
          nicknameMap[normalizedId] = nick.nickname;
        }
      });
      setNicknames(nicknameMap);
    } catch (error) {
      console.error('Error loading nicknames in ConversationsScreen:', error);
    }
  };

  useEffect(() => {
    if (socket) {
      setupSocketListeners();
    }
  }, [socket]);

  const setupSocketListeners = () => {
    if (!socket) return;
    
    const handleConversationUpdated = (data) => {
      console.log('📬 Conversation updated:', data);
      if (data.lastMessage) {
        updateConversationList(data.lastMessage);
      }
    };

    const handleNewMessage = async (message) => {
      console.log('📨 New message in ConversationsScreen:', message._id);
      
      // Update conversation list when new message arrives
      updateConversationList(message);
      
      // Show notification if app is not focused on this conversation
      const conversationId = message.conversation?._id || message.conversation?.id || message.conversation;
      const senderId = message.sender?._id || message.sender?.id || message.sender;
      
      // Don't show notification if message is from current user
      if (senderId === user?.id) {
        return;
      }
      
      if (conversationId && user?.id) {
        // Check if we're currently viewing this conversation
        // Get current route from navigation state
        const navigationState = navigation.getState();
        const currentRoute = navigationState?.routes?.[navigationState.index];
        const isViewingConversation = currentRoute?.name === 'Chat' && (
          currentRoute?.params?.conversation?._id === conversationId || 
          currentRoute?.params?.conversation?.id === conversationId ||
          currentRoute?.params?.conversationId === conversationId
        );
        
        console.log('🔔 Notification check:', {
          conversationId,
          currentRoute: currentRoute?.name,
          isViewingConversation,
          senderId,
          currentUserId: user.id
        });
        
        // Only show notification if not viewing this conversation
        if (!isViewingConversation) {
          console.log('🔔 Showing notification for message:', message._id);
          // Get conversation details
          try {
            const convRes = await api.get(`/conversations/${conversationId}`);
            const conversation = convRes.data;
            await notificationService.showMessageNotification(message, conversation, user.id);
            console.log('✅ Notification shown successfully');
          } catch (error) {
            console.error('Error getting conversation for notification:', error);
            // Still show notification with basic info
            await notificationService.showMessageNotification(message, { _id: conversationId }, user.id);
          }
        } else {
          console.log('🔕 Skipping notification - user is viewing this conversation');
        }
      }
    };
    
    socket.on('conversation-updated', handleConversationUpdated);
    socket.on('new-message', handleNewMessage);

    return () => {
      if (socket) {
        socket.off('conversation-updated', handleConversationUpdated);
        socket.off('new-message', handleNewMessage);
      }
    };
  };

  const loadConversations = async () => {
    try {
      // Chỉ load private conversations (tin nhắn riêng), không load groups
      const res = await api.get('/conversations?type=private');
      setConversations(res.data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateConversationList = (message) => {
    // Handle both string and object conversation IDs
    const messageConvId = typeof message.conversation === 'string' 
      ? message.conversation 
      : (message.conversation?._id || message.conversation?.id || message.conversation);
    
    if (!messageConvId) {
      console.log('⚠️ Cannot update conversation list: missing conversation ID');
      return;
    }
    
    setConversations((prev) => {
      const updated = prev.map((conv) => {
        const convId = conv._id || conv.id;
        if (convId && messageConvId.toString() === convId.toString()) {
          return { ...conv, lastMessage: message, lastMessageAt: message.createdAt };
        }
        return conv;
      });
      
      // Move updated conversation to top
      const index = updated.findIndex(c => {
        const cId = c._id || c.id;
        return cId && messageConvId.toString() === cId.toString();
      });
      if (index > 0) {
        const [moved] = updated.splice(index, 1);
        updated.unshift(moved);
      }
      
      return updated;
    });
  };

  const getConversationName = (conversation) => {
    // Nhóm: luôn dùng tên nhóm, KHÔNG BAO GIỜ dùng nickname
    if (conversation.type === 'group') {
      return conversation.name || 'Nhóm';
    }

    // Đếm số participants để phân biệt group vs private
    const participants = conversation.participants || [];
    const participantCount = Array.isArray(participants) ? participants.length : 0;
    
    // Nếu có nhiều hơn 2 người → coi là nhóm, dùng tên nhóm hoặc "Nhóm"
    if (participantCount > 2) {
      return conversation.name || 'Nhóm';
    }

    // Chỉ áp dụng nickname cho chat riêng (private hoặc 2 người)
    const otherUser = participants.find((p) => {
      const pId = p._id || p.id || p;
      return pId !== user.id;
    });

    if (!otherUser) return 'Unknown';

    const otherUserId = otherUser._id || otherUser.id || otherUser;
    const otherUserIdStr = otherUserId ? String(otherUserId) : '';
    const nickname = otherUserIdStr ? nicknames[otherUserIdStr] : null;

    return nickname || otherUser.fullName || 'Unknown';
  };

  const getLastMessage = (conversation) => {
    if (!conversation.lastMessage) return 'Chưa có tin nhắn';
    const sender = conversation.lastMessage.sender;
    const senderId = sender?._id || sender?.id || sender;
    const isOwn = senderId === user.id;
    return `${isOwn ? 'Bạn: ' : ''}${conversation.lastMessage.content}`;
  };

  const handleSelectConversation = (conversation) => {
    navigation.navigate('Chat', {
      conversation,
      conversationName: getConversationName(conversation),
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = getConversationName(conv).toLowerCase();
    const lastMsg = getLastMessage(conv).toLowerCase();
    return name.includes(query) || lastMsg.includes(query);
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00B14F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm cuộc trò chuyện..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const otherUser = item.participants?.find(p => {
            const pId = p._id || p.id || p;
            return pId !== user.id;
          });
          const otherUserId = otherUser?._id || otherUser?.id || otherUser;
          
          return (
          <TouchableOpacity
            style={styles.conversationItem}
            onPress={() => handleSelectConversation(item)}
            onLongPress={() => {
              const conversationId = item._id || item.id;
              const isPinned = pinnedConversations.includes(conversationId);
              const isArchived = archivedConversations.includes(conversationId);
              
              Alert.alert(
                'Tùy chọn',
                '',
                [
                  { text: 'Hủy', style: 'cancel' },
                  {
                    text: isPinned ? 'Bỏ ghim' : 'Ghim',
                    onPress: async () => {
                      try {
                        if (isPinned) {
                          await api.delete(`/conversations/${conversationId}/pin`);
                          setPinnedConversations(prev => prev.filter(id => id !== conversationId));
                        } else {
                          await api.post(`/conversations/${conversationId}/pin`);
                          setPinnedConversations(prev => [...prev, conversationId]);
                        }
                        Alert.alert('Thành công', isPinned ? 'Đã bỏ ghim' : 'Đã ghim');
                      } catch (error) {
                        console.error('Error pinning/unpinning:', error);
                        Alert.alert('Lỗi', 'Không thể thực hiện');
                      }
                    },
                  },
                  {
                    text: isArchived ? 'Bỏ lưu trữ' : 'Lưu trữ',
                    onPress: async () => {
                      try {
                        if (isArchived) {
                          await api.delete(`/conversations/${conversationId}/archive`);
                          setArchivedConversations(prev => prev.filter(id => id !== conversationId));
                        } else {
                          await api.post(`/conversations/${conversationId}/archive`);
                          setArchivedConversations(prev => [...prev, conversationId]);
                        }
                        Alert.alert('Thành công', isArchived ? 'Đã bỏ lưu trữ' : 'Đã lưu trữ');
                        loadConversations();
                      } catch (error) {
                        console.error('Error archiving/unarchiving:', error);
                        Alert.alert('Lỗi', 'Không thể thực hiện');
                      }
                    },
                  },
                  {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await api.delete(`/conversations/${conversationId}`);
                        setConversations(prev => prev.filter(c => (c._id || c.id) !== conversationId));
                        Alert.alert('Thành công', 'Đã xóa trò chuyện');
                      } catch (error) {
                        console.error('Error deleting conversation:', error);
                        Alert.alert('Lỗi', 'Không thể xóa trò chuyện');
                      }
                    },
                  },
                ]
              );
            }}
          >
            {otherUser?.avatar ? (
              <Image 
                source={{ uri: otherUser.avatar.startsWith('http') ? otherUser.avatar : `${BASE_URL}${otherUser.avatar}` }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getConversationName(item).charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.conversationInfo}>
              <View style={styles.conversationHeader}>
                <View style={styles.nameContainer}>
                  {pinnedConversations.includes(item._id || item.id) && (
                    <Ionicons name="pin" size={16} color="#00B14F" style={{ marginRight: 4 }} />
                  )}
                  <Text style={styles.conversationName}>
                    {getConversationName(item)}
                  </Text>
                  {/* Online Status */}
                  {otherUser?.isOnline && (
                    <View style={styles.onlineIndicator} />
                  )}
                </View>
                {item.lastMessageAt && (
                  <Text style={styles.time}>
                    {new Date(item.lastMessageAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                )}
              </View>
              <View style={styles.messageRow}>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {getLastMessage(item)}
                </Text>
                {/* Unread Badge - placeholder, cần implement logic đếm */}
              </View>
            </View>
            {/* Call buttons for private conversations */}
            {item.type === 'private' && otherUserId && socket && (
              <View style={styles.callButtons}>
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    if (!user?.id) return;
                    const callId = `call_${Date.now()}_${user.id}_${otherUserId}`;
                    socket.emit('call-request', {
                      callId,
                      fromUserId: user.id,
                      toUserId: otherUserId,
                      callType: 'voice'
                    });
                    navigation.navigate('Call', {
                      callType: 'voice',
                      userId: otherUserId,
                      userName: otherUser?.fullName || getConversationName(item),
                      userAvatar: otherUser?.avatar,
                      callId,
                      isIncoming: false,
                    });
                  }}
                >
                  <Ionicons name="call" size={20} color="#00B14F" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    if (!user?.id) return;
                    const callId = `call_${Date.now()}_${user.id}_${otherUserId}`;
                    socket.emit('call-request', {
                      callId,
                      fromUserId: user.id,
                      toUserId: otherUserId,
                      callType: 'video'
                    });
                    navigation.navigate('Call', {
                      callType: 'video',
                      userId: otherUserId,
                      userName: otherUser?.fullName || getConversationName(item),
                      userAvatar: otherUser?.avatar,
                      callId,
                      isIncoming: false,
                    });
                  }}
                >
                  <Ionicons name="videocam" size={20} color="#00B14F" />
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            {searchQuery ? (
              <>
                <Text style={styles.emptyText}>Không tìm thấy kết quả</Text>
                <Text style={styles.emptySubtext}>
                  Thử tìm kiếm với từ khóa khác
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào</Text>
                <Text style={styles.emptySubtext}>
                  Bấm vào nút + để bắt đầu chat
                </Text>
              </>
            )}
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderBottomWidth: 0,
    shadowColor: SHADOWS.CARD.shadowColor,
    shadowOffset: SHADOWS.CARD.shadowOffset,
    shadowOpacity: SHADOWS.CARD.shadowOpacity,
    shadowRadius: SHADOWS.CARD.shadowRadius,
    elevation: SHADOWS.CARD.elevation,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: RADIUS.LG,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    shadowColor: SHADOWS.CARD.shadowColor,
    shadowOffset: SHADOWS.CARD.shadowOffset,
    shadowOpacity: SHADOWS.CARD.shadowOpacity,
    shadowRadius: SHADOWS.CARD.shadowRadius,
    elevation: SHADOWS.CARD.elevation,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
    color: COLORS.TEXT_PRIMARY,
  },
  clearButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: RADIUS.LG,
    backgroundColor: COLORS.CARD_BACKGROUND,
    alignItems: 'center',
    shadowColor: SHADOWS.CARD.shadowColor,
    shadowOffset: SHADOWS.CARD.shadowOffset,
    shadowOpacity: SHADOWS.CARD.shadowOpacity,
    shadowRadius: SHADOWS.CARD.shadowRadius,
    elevation: SHADOWS.CARD.elevation,
  },
  callButtons: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 'auto',
  },
  callButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.PRIMARY_LIGHT,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginRight: 6,
  },
  onlineIndicator: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.SUCCESS,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: 12,
    color: COLORS.TEXT_TERTIARY,
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
  },
});

export default ConversationsScreen;

