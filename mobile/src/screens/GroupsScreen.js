/**
 * GroupsScreen Component
 * Display list of group conversations
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { getConversationId, getFirstChar } from '../utils/helpers';
import { COLORS } from '../utils/constants';

const GroupsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const socket = useSocket();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (socket) {
      setupSocketListeners();
    }
  }, [socket]);

  useEffect(() => {
    // Set header right button for creating group
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 16 }}
          onPress={() => navigation.navigate('CreateGroup')}
        >
          <Ionicons name="add-circle" size={28} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const setupSocketListeners = () => {
    if (!socket) return;

    const handleConversationUpdated = (data) => {
      if (data.type === 'group') {
        updateGroupList(data);
      }
    };

    socket.on('conversation-updated', handleConversationUpdated);

    return () => {
      if (socket) {
        socket.off('conversation-updated', handleConversationUpdated);
      }
    };
  };

  const updateGroupList = (data) => {
    setGroups((prev) => {
      const updated = prev.map((group) => {
        const groupId = getConversationId(group);
        if (groupId && data.conversationId === groupId) {
          return { ...group, lastMessage: data.lastMessage, lastMessageAt: data.lastMessageAt };
        }
        return group;
      });

      // Move updated group to top
      const index = updated.findIndex((g) => {
        const gId = getConversationId(g);
        return gId && data.conversationId === gId;
      });
      if (index > 0) {
        const [moved] = updated.splice(index, 1);
        updated.unshift(moved);
      }

      return updated;
    });
  };

  const loadGroups = async () => {
    try {
      setLoading(true);
      const res = await api.get('/conversations?type=group');
      setGroups(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error loading groups:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách nhóm');
      setGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadGroups();
  };

  const handleSelectGroup = (group) => {
    navigation.navigate('Chat', {
      conversation: group,
      conversationName: group.name || 'Nhóm',
    });
  };

  const getLastMessage = (group) => {
    if (!group.lastMessage) return 'Chưa có tin nhắn';
    const sender = group.lastMessage.sender;
    const senderId = sender?._id || sender?.id || sender;
    const isOwn = senderId === user?.id;
    return `${isOwn ? 'Bạn: ' : ''}${group.lastMessage.content}`;
  };

  const filteredGroups = groups.filter((group) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = (group.name || 'Nhóm').toLowerCase();
    const lastMsg = getLastMessage(group).toLowerCase();
    return name.includes(query) || lastMsg.includes(query);
  });

  const renderGroup = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.groupItem}
        onPress={() => handleSelectGroup(item)}
        onLongPress={() => {
          const groupId = getConversationId(item);
          const participants = item.participants || [];
          const isAdmin = participants.length > 0 && participants[0] === user?.id;
          
          Alert.alert(
            'Tùy chọn',
            '',
            [
              { text: 'Hủy', style: 'cancel' },
              {
                text: 'Rời nhóm',
                style: 'default',
                onPress: async () => {
                  Alert.alert(
                    'Rời nhóm',
                    'Bạn có chắc chắn muốn rời khỏi nhóm này?',
                    [
                      { text: 'Hủy', style: 'cancel' },
                      {
                        text: 'Rời nhóm',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await api.delete(`/conversations/${groupId}`);
                            setGroups((prev) => prev.filter((g) => getConversationId(g) !== groupId));
                            Alert.alert('Thành công', 'Đã rời nhóm');
                          } catch (error) {
                            console.error('Error leaving group:', error);
                            Alert.alert('Lỗi', 'Không thể rời nhóm');
                          }
                        },
                      },
                    ]
                  );
                },
              },
              isAdmin && {
                text: 'Giải tán nhóm',
                style: 'destructive',
                onPress: async () => {
                  Alert.alert(
                    'Giải tán nhóm',
                    'Bạn có chắc chắn muốn giải tán nhóm này? Hành động này không thể hoàn tác.',
                    [
                      { text: 'Hủy', style: 'cancel' },
                      {
                        text: 'Giải tán',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await api.delete(`/conversations/${groupId}/dissolve`);
                            setGroups((prev) => prev.filter((g) => getConversationId(g) !== groupId));
                            Alert.alert('Thành công', 'Đã giải tán nhóm');
                          } catch (error) {
                            console.error('Error dissolving group:', error);
                            Alert.alert('Lỗi', 'Không thể giải tán nhóm');
                          }
                        },
                      },
                    ]
                  );
                },
              },
            ].filter(Boolean)
          );
        }}
      >
        <View style={styles.groupAvatar}>
          <Text style={styles.groupAvatarText}>
            {getFirstChar(item.name || 'Nhóm')}
          </Text>
        </View>
        <View style={styles.groupInfo}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupName}>{item.name || 'Nhóm chat'}</Text>
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
          </View>
          <Text style={styles.memberCount}>
            {item.participants?.length || 0} thành viên
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
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
          placeholder="Tìm kiếm nhóm..."
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
        data={filteredGroups}
        keyExtractor={(item) => getConversationId(item)}
        renderItem={renderGroup}
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
                <Ionicons name="people-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>Chưa có nhóm nào</Text>
                <Text style={styles.emptySubtext}>
                  Bấm vào nút + để tạo nhóm mới
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
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
  groupItem: {
    flexDirection: 'row',
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    backgroundColor: COLORS.CARD_BACKGROUND,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  groupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6a1b9a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  groupInfo: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginRight: 6,
  },
  time: {
    fontSize: 12,
    color: COLORS.TEXT_TERTIARY,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    flex: 1,
  },
  memberCount: {
    fontSize: 12,
    color: COLORS.TEXT_TERTIARY,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.TEXT_TERTIARY,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.TEXT_TERTIARY,
  },
});

export default GroupsScreen;

