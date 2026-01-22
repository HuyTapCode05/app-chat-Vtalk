import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import api, { BASE_URL } from '../config/api';
import { Ionicons } from '@expo/vector-icons';
import ContactMenu from '../components/ContactMenu';
import { ContactSkeleton, SkeletonBox } from '../components/Skeleton';
import { getUserId, getUserDisplayName, getImageUrl, getFirstChar } from '../utils/helpers';

const ContactsScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const socket = useSocket();
  const [activeTab, setActiveTab] = useState('friends'); // 'requests', 'friends', 'groups', 'all'
  const [users, setUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [friendRequests, setFriendRequests] = useState({ incoming: [], sent: [] });
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [nicknames, setNicknames] = useState({}); // { userId: nickname }
  const [closeFriends, setCloseFriends] = useState([]); // Array of friend IDs

  // Memoized current user ID
  const currentUserId = useMemo(() => getUserId(user), [user]);

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadNicknames = async () => {
    try {
      const res = await api.get('/nicknames');
      const nicknameMap = {};
      (res.data || []).forEach(nick => {
        if (nick.targetUserId) {
          nicknameMap[nick.targetUserId] = nick.nickname;
        }
      });
      setNicknames(nicknameMap);
    } catch (error) {
      console.error('Error loading nicknames:', error);
    }
  };

  const loadCloseFriends = async () => {
    try {
      const res = await api.get('/close-friends');
      const closeFriendIds = (res.data || []).map(f => f._id || f.id);
      setCloseFriends(closeFriendIds);
    } catch (error) {
      console.error('Error loading close friends:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadUsers(),
        loadFriendRequests(),
        loadFriends(),
        loadGroups(),
        loadNicknames(),
        loadCloseFriends(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.get('/users');
      const usersData = Array.isArray(res.data) ? res.data : [];
      console.log('✅ Loaded users:', usersData.length);
      setUsers(usersData);
    } catch (error) {
      console.error('❌ Error loading users:', error);
      console.error('Error details:', error.response?.data || error.message);
      setUsers([]);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const res = await api.get('/friends/requests');
      const data = res.data || {};
      setFriendRequests({
        incoming: Array.isArray(data.incoming) ? data.incoming : [],
        sent: Array.isArray(data.sent) ? data.sent : [],
      });
    } catch (error) {
      console.error('Error loading friend requests:', error);
      setFriendRequests({ incoming: [], sent: [] });
    }
  };

  const loadFriends = async () => {
    try {
      const res = await api.get('/friends');
      setFriends(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error loading friends:', error);
      setFriends([]);
    }
  };

  const loadGroups = async () => {
    try {
      const res = await api.get('/conversations');
      const groupConversations = Array.isArray(res.data) 
        ? res.data.filter(c => c && c.type === 'group')
        : [];
      setGroups(groupConversations);
    } catch (error) {
      console.error('Error loading groups:', error);
      setGroups([]);
    }
  };

  const handleSendFriendRequest = async (userId) => {
    try {
      await api.post('/friends/request', { toUserId: userId });
      Alert.alert('Thành công', 'Đã gửi lời mời kết bạn');
      loadFriendRequests();
    } catch (error) {
      const message = error.response?.data?.message || 'Không thể gửi lời mời kết bạn';
      Alert.alert('Lỗi', message);
    }
  };

  const handleAcceptFriendRequest = async (requestId) => {
    try {
      await api.put(`/friends/request/${requestId}/accept`);
      Alert.alert('Thành công', 'Đã chấp nhận lời mời kết bạn');
      loadFriendRequests();
      loadFriends();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chấp nhận lời mời kết bạn');
    }
  };

  const handleRejectFriendRequest = async (requestId) => {
    try {
      await api.put(`/friends/request/${requestId}/reject`);
      Alert.alert('Thành công', 'Đã từ chối lời mời kết bạn');
      loadFriendRequests();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể từ chối lời mời kết bạn');
    }
  };

  const handleStartConversation = async (userId) => {
    try {
      if (!userId) {
        console.error('❌ Invalid userId:', userId);
        return;
      }
      
      const res = await api.post('/conversations', {
        participantIds: [userId],
        type: 'private',
      });
      
      const usersList = Array.isArray(users) ? users : [];
      const friendsList = Array.isArray(friends) ? friends : [];
      const targetUser = usersList.find(u => (u._id || u.id) === userId) || 
                         friendsList.find(f => (f._id || f.id) === userId);
      
      if (navigation && navigation.navigate) {
        navigation.navigate('Chat', {
          conversation: res.data,
          conversationName: targetUser?.fullName || 'Chat',
        });
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      Alert.alert('Lỗi', 'Không thể bắt đầu cuộc trò chuyện');
    }
  };

  const handleOpenGroup = (group) => {
    try {
      if (!group || !navigation || !navigation.navigate) return;
      navigation.navigate('Chat', {
        conversation: group,
        conversationName: group.name || 'Nhóm',
      });
    } catch (error) {
      console.error('Error opening group:', error);
      Alert.alert('Lỗi', 'Không thể mở nhóm');
    }
  };

  const getFriendRequestStatus = (userId) => {
    if (!userId) return null;
    
    const sentRequests = Array.isArray(friendRequests?.sent) ? friendRequests.sent : [];
    const sentRequest = sentRequests.find(r => {
      const toUserId = r?.toUserId || r?.toUser?.id || r?.toUser?._id;
      return toUserId === userId;
    });
    if (sentRequest) return 'sent';

    const incomingRequests = Array.isArray(friendRequests?.incoming) ? friendRequests.incoming : [];
    const incomingRequest = incomingRequests.find(r => {
      const fromUserId = r?.fromUserId || r?.fromUser?.id || r?.fromUser?._id;
      return fromUserId === userId;
    });
    if (incomingRequest) {
      // Store requestId for later use
      const requestId = incomingRequest.id || incomingRequest._id;
      return { type: 'incoming', requestId };
    }

    const friendsList = Array.isArray(friends) ? friends : [];
    const isFriend = friendsList.some(f => f && (f._id || f.id) === userId);
    if (isFriend) return 'friend';

    return null;
  };

  // Filter data based on active tab and search
  const getFilteredData = () => {
    const query = (searchQuery || '').toLowerCase();
    
    try {
      switch (activeTab) {
        case 'requests':
          const incomingRequests = Array.isArray(friendRequests?.incoming) ? friendRequests.incoming : [];
          return incomingRequests.filter(req => {
            if (!req) return false;
            const requestUser = req.user || req.fromUser;
            if (!requestUser) return false;
            const name = requestUser.fullName || '';
            return name.toLowerCase().includes(query);
          });
        
        case 'friends':
          const friendsList = Array.isArray(friends) ? friends : [];
          return friendsList.filter(friend => {
            if (!friend) return false;
            const name = friend.fullName || '';
            return name.toLowerCase().includes(query);
          });
        
        case 'groups':
          const groupsList = Array.isArray(groups) ? groups : [];
          return groupsList.filter(group => {
            if (!group) return false;
            const name = group.name || 'Nhóm';
            return name.toLowerCase().includes(query);
          });
        
        case 'all':
          const usersList = Array.isArray(users) ? users : [];
          return usersList.filter(u => {
            if (!u) return false;
            const userId = u._id || u.id;
            if (userId === user?.id) return false;
            const name = u.fullName || '';
            const username = u.username || '';
            return name.toLowerCase().includes(query) || username.toLowerCase().includes(query);
          });
        
        default:
          return [];
      }
    } catch (error) {
      console.error('Error filtering data:', error);
      return [];
    }
  };

  const renderFriendRequest = ({ item }) => {
    if (!item) return null;
    
    const requestUser = item.user || item.fromUser;
    if (!requestUser) return null;
    
    const userId = requestUser._id || requestUser.id;
    const requestId = item.id || item._id;
    
    if (!requestId) return null;

    return (
      <View style={[
        styles.contactItem,
        { backgroundColor: theme?.card, borderBottomColor: theme?.divider }
      ]}>
        <TouchableOpacity
          style={styles.contactContent}
          onPress={() => {
            console.log('🔍 [renderFriendRequest] Navigating to PersonalPage with userId:', userId);
            navigation.navigate('PersonalPage', { userId });
          }}
        >
          <View style={styles.avatarContainer}>
            {requestUser.avatar ? (
              <Image 
                source={{ uri: requestUser.avatar.startsWith('http') ? requestUser.avatar : `${BASE_URL}${requestUser.avatar}` }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getFirstChar(requestUser.fullName)}
                </Text>
              </View>
            )}
            {requestUser.isOnline && <View style={styles.onlineBadge} />}
          </View>
          <View style={styles.contactInfo}>
            <Text style={[styles.contactName, { color: theme?.text }]}>
              {nicknames[userId] || requestUser.fullName || 'User'}
            </Text>
            {nicknames[userId] && (
              <Text style={[styles.contactSubtext, { color: theme?.textSecondary }]}>{requestUser.fullName}</Text>
            )}
            <Text style={[styles.contactStatus, { color: theme?.textSecondary }]}>Đã gửi lời mời kết bạn</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAcceptFriendRequest(requestId)}
          >
            <Ionicons name="checkmark" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleRejectFriendRequest(requestId)}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFriend = ({ item }) => {
    if (!item) return null;
    
    const userId = item._id || item.id;
    if (!userId) return null;
    
    return (
      <View style={[
        styles.contactItem,
        { backgroundColor: theme?.card, borderBottomColor: theme?.divider }
      ]}>
        <TouchableOpacity
          style={styles.contactContent}
          onPress={() => {
            console.log('🔍 Navigating to PersonalPage with userId:', userId);
            navigation.navigate('PersonalPage', { userId });
          }}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getFirstChar(item.fullName)}
              </Text>
            </View>
            {item.isOnline && <View style={styles.onlineBadge} />}
          </View>
          <View style={styles.contactInfo}>
            <Text style={[styles.contactName, { color: theme?.text }]}>
              {nicknames[userId] || item.fullName || 'User'}
            </Text>
            {nicknames[userId] && (
              <Text style={[styles.contactSubtext, { color: theme?.textSecondary }]}>{item.fullName}</Text>
            )}
            <Text style={[styles.contactStatus, { color: theme?.textSecondary }]}>
              {item.isOnline ? 'Đang hoạt động' : 'Offline'}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              if (!user?.id) return;
              const callId = `call_${Date.now()}_${user.id}_${userId}`;
              navigation.navigate('Call', {
                callType: 'voice',
                userId: userId,
                userName: nicknames[userId] || item.fullName,
                userAvatar: item.avatar,
                callId,
                isIncoming: false,
              });
            }}
          >
            <Ionicons name="call" size={22} color={theme?.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              if (!user?.id) return;
              const callId = `call_${Date.now()}_${user.id}_${userId}`;
              navigation.navigate('Call', {
                callType: 'video',
                userId: userId,
                userName: nicknames[userId] || item.fullName,
                userAvatar: item.avatar,
                callId,
                isIncoming: false,
              });
            }}
          >
            <Ionicons name="videocam" size={22} color={theme?.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('PersonalPage', { userId })}
          >
            <Ionicons name="person-circle-outline" size={22} color={theme?.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setSelectedUser(item);
              setMenuVisible(true);
            }}
          >
            <Ionicons name="ellipsis-vertical" size={22} color={theme?.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderGroup = ({ item }) => {
    if (!item) return null;
    
    const participantCount = Array.isArray(item.participants) ? item.participants.length : 0;
    
    return (
      <TouchableOpacity
        style={[
          styles.contactItem,
          { backgroundColor: theme?.card, borderBottomColor: theme?.divider }
        ]}
        onPress={() => handleOpenGroup(item)}
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, styles.groupAvatar]}>
            <Ionicons name="people" size={24} color="#fff" />
          </View>
        </View>
        <View style={styles.contactInfo}>
          <Text style={[styles.contactName, { color: theme?.text }]}>{item.name || 'Nhóm'}</Text>
          <Text style={[styles.contactStatus, { color: theme?.textSecondary }]}>
            {participantCount} thành viên
          </Text>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleOpenGroup(item)}
        >
          <Ionicons name="chevron-forward" size={22} color={theme?.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderAllUser = ({ item }) => {
    if (!item) return null;
    
    const userId = item._id || item.id;
    if (!userId) return null;
    
    const requestStatus = getFriendRequestStatus(userId);
    
    return (
      <View style={[
        styles.contactItem,
        { backgroundColor: theme?.card, borderBottomColor: theme?.divider }
      ]}>
        <TouchableOpacity
          style={styles.contactContent}
          onPress={() => navigation.navigate('PersonalPage', { userId })}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getFirstChar(item.fullName)}
              </Text>
            </View>
            {item.isOnline && <View style={styles.onlineBadge} />}
          </View>
          <View style={styles.contactInfo}>
            <Text style={[styles.contactName, { color: theme?.text }]}>
              {nicknames[userId] || item.fullName || 'User'}
            </Text>
            {nicknames[userId] && (
              <Text style={[styles.contactSubtext, { color: theme?.textSecondary }]}>{item.fullName}</Text>
            )}
            <Text style={[styles.contactStatus, { color: theme?.textSecondary }]}>
              {item.isOnline ? 'Đang hoạt động' : 'Offline'}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.actionButtons}>
          {requestStatus === 'friend' ? (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleStartConversation(userId)}
              >
                <Ionicons name="chatbubble" size={22} color={theme?.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('PersonalPage', { userId })}
              >
                <Ionicons name="person-circle-outline" size={22} color={theme?.primary} />
              </TouchableOpacity>
            </>
          ) : requestStatus === 'sent' ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.pendingButton]}
              disabled
            >
              <Ionicons name="time-outline" size={22} color="#999" />
            </TouchableOpacity>
          ) : requestStatus && requestStatus.type === 'incoming' ? (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleAcceptFriendRequest(requestStatus.requestId)}
              >
                <Ionicons name="checkmark" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleRejectFriendRequest(requestStatus.requestId)}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.addFriendButton]}
              onPress={() => handleSendFriendRequest(userId)}
            >
              <Ionicons name="person-add" size={22} color={theme?.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderContent = () => {
    const filteredData = getFilteredData();

    if (loading) {
      return (
        <FlatList
          data={[1, 2, 3, 4, 5, 6]}
          keyExtractor={(item) => String(item)}
          renderItem={() => <ContactSkeleton />}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    switch (activeTab) {
      case 'requests':
        return (
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item.id || item._id || Math.random().toString()}
            renderItem={renderFriendRequest}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="person-add-outline" size={64} color={theme?.textMuted || '#ccc'} />
                <Text style={[styles.emptyText, { color: theme?.textSecondary }]}>Không có lời mời kết bạn</Text>
              </View>
            }
          />
        );
      
      case 'friends':
        return (
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item._id || item.id}
            renderItem={renderFriend}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={64} color={theme?.textMuted || '#ccc'} />
                <Text style={[styles.emptyText, { color: theme?.textSecondary }]}>Chưa có bạn bè</Text>
                <Text style={[styles.emptySubtext, { color: theme?.textMuted }]}>Tìm kiếm và gửi lời mời kết bạn</Text>
              </View>
            }
          />
        );
      
      case 'groups':
        return (
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item._id || item.id}
            renderItem={renderGroup}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={64} color={theme?.textMuted || '#ccc'} />
                <Text style={[styles.emptyText, { color: theme?.textSecondary }]}>Chưa có nhóm nào</Text>
              </View>
            }
          />
        );
      
      case 'all':
        return (
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item._id || item.id}
            renderItem={renderAllUser}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: theme?.textSecondary }]}>Không tìm thấy người dùng</Text>
              </View>
            }
          />
        );
      
      default:
        return null;
    }
  };

  // Safety check - ensure user exists
  if (!user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme?.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme?.background || (isDarkMode ? '#121212' : '#FFFFFF') }]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme?.card || (isDarkMode ? '#1E1E1E' : '#F5F5F5') }]}>
        <Ionicons name="search" size={20} color={theme?.textSecondary || (isDarkMode ? '#666666' : '#999999')} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme?.text || (isDarkMode ? '#FFFFFF' : '#000000') }]}
          placeholder="Tìm kiếm..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme?.textSecondary || (isDarkMode ? '#666666' : '#999999')}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: theme?.card, borderBottomColor: theme?.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && { borderBottomColor: theme?.primary }]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.tabText, { color: theme?.textSecondary }, activeTab === 'requests' && { color: theme?.primary }]}>
              Lời mời
            </Text>
            {friendRequests && Array.isArray(friendRequests.incoming) && friendRequests.incoming.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{friendRequests.incoming.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'friends' && { borderBottomColor: theme?.primary }]}
            onPress={() => setActiveTab('friends')}
          >
            <Text style={[styles.tabText, { color: theme?.textSecondary }, activeTab === 'friends' && { color: theme?.primary }]}>
              Bạn bè
            </Text>
            {friends && Array.isArray(friends) && friends.length > 0 && (
              <Text style={[styles.countText, { color: theme?.textSecondary }]}>({friends.length})</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'groups' && { borderBottomColor: theme?.primary }]}
            onPress={() => setActiveTab('groups')}
          >
            <Text style={[styles.tabText, { color: theme?.textSecondary }, activeTab === 'groups' && { color: theme?.primary }]}>
              Nhóm
            </Text>
            {groups && Array.isArray(groups) && groups.length > 0 && (
              <Text style={[styles.countText, { color: theme?.textSecondary }]}>({groups.length})</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && { borderBottomColor: theme?.primary }]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, { color: theme?.textSecondary }, activeTab === 'all' && { color: theme?.primary }]}>
              Tất cả
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Content */}
      {renderContent()}

      {/* Contact Menu */}
      <ContactMenu
        visible={menuVisible}
        onClose={() => {
          setMenuVisible(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        currentUserId={user?.id || user?._id}
        onUnfriend={async (userId) => {
          await loadData();
        }}
        onBlock={async (userId) => {
          await loadData();
        }}
        onSetNickname={async (userId, nickname) => {
          await loadData();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#00B14F',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#00B14F',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#ff3040',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  countText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactContent: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00B14F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  groupAvatar: {
    backgroundColor: '#667eea',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  contactInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  contactSubtext: {
    fontSize: 13,
    color: '#999',
    marginBottom: 2,
    fontStyle: 'italic',
  },
  contactStatus: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  addFriendButton: {
    backgroundColor: '#E6F9EE',
  },
  pendingButton: {
    backgroundColor: '#fff3cd',
  },
  acceptButton: {
    backgroundColor: '#00B14F',
  },
  rejectButton: {
    backgroundColor: '#ff3040',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
});

export default ContactsScreen;
