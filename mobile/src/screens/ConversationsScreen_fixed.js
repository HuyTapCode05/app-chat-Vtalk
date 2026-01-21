import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import EmptyState from '../components/EmptyState';

const BASE_URL = 'http://192.168.1.5:5000';

const ConversationsScreen = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { socket } = useSocket();
  const navigation = useNavigation();
  
  const [conversations, setConversations] = useState([]);
  const [nicknames, setNicknames] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pinnedConversations, setPinnedConversations] = useState([]);
  const [archivedConversations, setArchivedConversations] = useState([]);

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conversation => {
    const displayName = getDisplayName(conversation);
    return displayName.toLowerCase().includes(searchQuery.toLowerCase());
  });

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
    }, [])
  );

  const renderConversationItem = ({ item }) => {
    console.log('🎨 Rendering conversation item:', {
      id: item._id || item.id,
      hasParticipants: !!item.participants,
      participantsCount: item.participants?.length || 0
    });

    const displayName = getDisplayName(item);
    const conversationId = item._id || item.id;
    
    return (
      <TouchableOpacity
        style={[styles.conversationItem, { backgroundColor: theme.colors.card }]}
        onPress={() => handleSelectConversation(item)}
      >
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.avatarText, { color: '#FFFFFF' }]}>
            {String(displayName).charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Content */}
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text 
              style={[styles.conversationName, { color: theme.colors.text }]} 
              numberOfLines={1}
            >
              {String(displayName)}
            </Text>
            <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
              {item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              }) : ''}
            </Text>
          </View>
          
          <Text 
            style={[styles.lastMessage, { color: theme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.lastMessage?.content || 'Chưa có tin nhắn'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.center}>
          <Text style={{ color: theme.colors.text }}>Đang tải...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search Header */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.card }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.background }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Tìm kiếm cuộc trò chuyện..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Conversations List */}
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => String(item._id || item.id || Math.random())}
        renderItem={renderConversationItem}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
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
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
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
    paddingVertical: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
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
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
  },
  lastMessage: {
    fontSize: 14,
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