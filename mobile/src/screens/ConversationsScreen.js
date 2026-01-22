import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import EmptyState from '../components/EmptyState';
import StoryList from '../components/StoryList';

import { BASE_URL } from '../config/api';

const ConversationsScreen = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const socketContext = useSocket();
  const socket = socketContext?.socket;
  const navigation = useNavigation();
  const storyListRef = useRef(null);
  
  const [conversations, setConversations] = useState([]);
  const [nicknames, setNicknames] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pinnedConversations, setPinnedConversations] = useState([]);
  const [archivedConversations, setArchivedConversations] = useState([]);

  const getDisplayName = (conversation) => {
    if (!conversation) return 'Unknown';
    
    const otherUser = conversation.participants?.find(p => {
      const pId = p._id || p.id || p;
      return pId !== user?.id;
    });

    if (!otherUser) return 'Unknown';

    const userId = otherUser._id || otherUser.id || otherUser;
    const nickname = nicknames[userId];
    
    if (nickname) return nickname;
    if (otherUser.fullName) return otherUser.fullName;
    if (otherUser.username) return otherUser.username;
    return 'Unknown User';
  };

  const formatLastMessage = (message) => {
    if (!message) return 'Chưa có tin nhắn';
    
    if (message.type === 'voice') {
      return '🎤 Tin nhắn thoại';
    } else if (message.type === 'image') {
      return '📷 Hình ảnh';
    } else if (message.recalled) {
      return 'Tin nhắn đã được thu hồi';
    } else {
      return message.content || 'Tin nhắn';
    }
  };

  const filteredConversations = conversations.filter(conversation => {
    const displayName = getDisplayName(conversation);
    return displayName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const loadConversations = async () => {
    try {
      console.log('🔄 Loading conversations...');
      const res = await api.get('/conversations?type=private');
      console.log('✅ Conversations loaded:', res.data.length);
      setConversations(res.data);
    } catch (error) {
      console.error('❌ Error loading conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadNicknames = async () => {
    try {
      console.log('🔄 Loading nicknames...');
      const res = await api.get('/nicknames');
      console.log('✅ Nicknames loaded:', Object.keys(res.data).length);
      setNicknames(res.data);
    } catch (error) {
      console.error('❌ Error loading nicknames:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations();
    loadNicknames();
    // Also refresh stories
    storyListRef.current?.refresh();
  };

  const handleCreateStory = () => {
    navigation.navigate('CreateStory');
  };

  const handleSelectConversation = (conversation) => {
    const conversationId = conversation._id || conversation.id;
    
    navigation.navigate('Chat', {
      conversationId: conversationId,
      conversation: conversation,
    });
  };

  // Focus effect to reload when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 ConversationsScreen focused, refreshing...');
      loadConversations();
      loadNicknames();
      // Refresh stories when coming back from CreateStory
      storyListRef.current?.refresh();
    }, [])
  );

  const renderConversationItem = ({ item }) => {
    const displayName = getDisplayName(item);
    const conversationId = item._id || item.id;
    
    // Get other user info for avatar and online status
    const otherUser = item.participants?.find(p => {
      const pId = p._id || p.id || p;
      return pId !== user?.id;
    });
    
    const otherUserAvatar = typeof otherUser === 'object' ? otherUser.avatar : null;
    const otherUserOnline = typeof otherUser === 'object' ? otherUser.isOnline : false;
    const avatarUrl = otherUserAvatar ? (otherUserAvatar.startsWith('http') ? otherUserAvatar : `${BASE_URL}${otherUserAvatar}`) : null;
    
    return (
      <TouchableOpacity
        style={[styles.conversationItem, { backgroundColor: theme.card }]}
        onPress={() => handleSelectConversation(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image 
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={[styles.avatarText, { color: '#FFFFFF' }]}>
                {String(displayName).charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {otherUserOnline && (
            <View style={[styles.onlineIndicator, { backgroundColor: theme.onlineIndicator }]} />
          )}
        </View>

        {/* Content */}
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text 
              style={[styles.conversationName, { color: theme.text }]} 
              numberOfLines={1}
            >
              {String(displayName)}
            </Text>
            <Text style={[styles.time, { color: theme.textSecondary }]}>
              {item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              }) : ''}
            </Text>
          </View>
          
          <Text 
            style={[styles.lastMessage, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {formatLastMessage(item.lastMessage)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <Text style={{ color: theme.text }}>Đang tải...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search Header */}
      <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: theme.background }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Tìm kiếm cuộc trò chuyện..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Stories List */}
      <StoryList 
        ref={storyListRef}
        onCreateStory={handleCreateStory}
        onViewStory={(userStoryGroup) => navigation.navigate('StoryViewer', { userStoryGroup })}
      />

      {/* Conversations List */}
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => String(item._id || item.id || Math.random())}
        renderItem={renderConversationItem}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
        )}
        ListEmptyComponent={
          <EmptyState
            title="Chưa có cuộc trò chuyện"
            message="Bắt đầu trò chuyện với bạn bè của bạn!"
            theme={theme}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        contentContainerStyle={filteredConversations.length === 0 && styles.emptyContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.3,
  },
  time: {
    fontSize: 13,
    fontWeight: '400',
  },
  lastMessage: {
    fontSize: 15,
    lineHeight: 20,
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 78,
  },
  emptyContainer: {
    flex: 1,
  },
});

export default ConversationsScreen;