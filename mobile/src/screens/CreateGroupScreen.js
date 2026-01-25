import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../config/api';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../config/api';

const CreateGroupScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme?.isDarkMode || false;
  const [groupName, setGroupName] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If search query is empty, clear results
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    // Debounce search - wait 500ms after user stops typing
    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/users/search', {
          params: { q: searchQuery.trim() }
        });
        // Filter out already selected users
        const filtered = res.data.filter(u => 
          !selectedUsers.some(su => (typeof su === 'object' ? su.id : su) === u.id)
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, selectedUsers]);

  const toggleUserSelection = (userObj) => {
    setSelectedUsers(prev => {
      const userId = userObj.id || userObj;
      const exists = prev.some(u => (typeof u === 'object' ? u.id : u) === userId);
      
      if (exists) {
        return prev.filter(u => (typeof u === 'object' ? u.id : u) !== userId);
      } else {
        return [...prev, userObj];
      }
    });
    
    // Remove from search results when selected
    setSearchResults(prev => prev.filter(u => u.id !== userObj.id));
    
    // Clear search query after selecting
    setSearchQuery('');
  };

  const removeSelectedUser = (userId) => {
    setSelectedUsers(prev => prev.filter(u => (typeof u === 'object' ? u.id : u) !== userId));
  };

  const handleCreateGroup = async () => {
    if (creating) return; // Prevent multiple calls
    
    if (!groupName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm');
      return;
    }

    if (selectedUsers.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất 1 thành viên');
      return;
    }

    setCreating(true);
    try {
      // Extract user IDs from selectedUsers (handle both object and ID)
      const participantIds = selectedUsers.map(u => typeof u === 'object' ? u.id : u);
      
      const res = await api.post('/conversations', {
        participantIds,
        type: 'group',
        name: groupName.trim(),
      });

      navigation.replace('Chat', {
        conversation: res.data,
        conversationName: res.data.name || groupName.trim(),
      });
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tạo nhóm');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme?.background || (isDarkMode ? '#121212' : '#FFFFFF') }]}>
      <View style={[styles.header, { borderBottomColor: theme?.border || (isDarkMode ? '#404040' : '#e0e0e0') }]}>
        <TextInput
          style={[
            styles.groupNameInput,
            {
              backgroundColor: theme?.inputBackground || (isDarkMode ? '#2D2D2D' : '#FFFFFF'),
              borderColor: theme?.border || (isDarkMode ? '#404040' : '#e0e0e0'),
              color: theme?.text || (isDarkMode ? '#FFFFFF' : '#000000'),
            }
          ]}
          placeholder="Tên nhóm"
          value={groupName}
          onChangeText={setGroupName}
          placeholderTextColor={theme?.placeholder || (isDarkMode ? '#666666' : '#999999')}
        />
      </View>

      {/* Selected users chips */}
      {selectedUsers.length > 0 && (
        <View style={[styles.selectedContainer, { backgroundColor: theme?.surface || (isDarkMode ? '#1E1E1E' : '#f5f5f5'), borderBottomColor: theme?.border || (isDarkMode ? '#404040' : '#e0e0e0') }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedUsers.map((userObj) => {
              const u = typeof userObj === 'object' ? userObj : null;
              const userId = u ? u.id : userObj;
              const userName = u ? u.fullName : 'User';
              const userAvatar = u?.avatar;
              
              return (
                <View key={userId} style={[styles.selectedChip, { backgroundColor: theme?.card || (isDarkMode ? '#2D2D2D' : '#fff'), borderColor: theme?.primary || '#00B14F' }]}>
                  {userAvatar ? (
                    <Image
                      source={{
                        uri: userAvatar.startsWith('http') ? userAvatar : `${BASE_URL}${userAvatar}`
                      }}
                      style={styles.chipAvatar}
                    />
                  ) : (
                    <View style={styles.chipAvatarPlaceholder}>
                      <Text style={styles.chipAvatarText}>
                        {userName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.chipText, { color: theme?.text || (isDarkMode ? '#FFFFFF' : '#333333') }]} numberOfLines={1}>
                    {userName}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeSelectedUser(userId)}
                    style={styles.chipRemove}
                  >
                    <Ionicons name="close-circle" size={18} color={theme?.textSecondary || (isDarkMode ? '#B3B3B3' : '#666666')} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Search bar */}
      <View style={[styles.searchContainer, { borderBottomColor: theme?.border || (isDarkMode ? '#404040' : '#e0e0e0') }]}>
        <Ionicons name="search" size={20} color={theme?.placeholder || (isDarkMode ? '#666666' : '#999999')} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme?.text || (isDarkMode ? '#FFFFFF' : '#000000') }]}
          placeholder="Tìm kiếm theo username..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme?.placeholder || (isDarkMode ? '#666666' : '#999999')}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color={theme?.placeholder || (isDarkMode ? '#666666' : '#999999')} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search results */}
      {searchQuery.trim() ? (
        searching ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme?.primary || '#00B14F'} />
            <Text style={[styles.searchHint, { color: theme?.textSecondary || (isDarkMode ? '#B3B3B3' : '#999999') }]}>Đang tìm kiếm...</Text>
          </View>
        ) : searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = selectedUsers.some(
                su => (typeof su === 'object' ? su.id : su) === item.id
              );
              return (
                <TouchableOpacity
                  style={[
                    styles.userItem,
                    { borderBottomColor: theme?.divider || (isDarkMode ? '#2D2D2D' : '#f0f0f0') },
                    isSelected && { backgroundColor: theme?.primaryLight || (isDarkMode ? '#1B3B1F' : '#f0fdf4') }
                  ]}
                  onPress={() => toggleUserSelection(item)}
                >
                  {item.avatar ? (
                    <Image
                      source={{
                        uri: item.avatar.startsWith('http') ? item.avatar : `${BASE_URL}${item.avatar}`
                      }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {item.fullName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: theme?.text || (isDarkMode ? '#FFFFFF' : '#333333') }]}>{item.fullName}</Text>
                    <Text style={[styles.userUsername, { color: theme?.textSecondary || (isDarkMode ? '#B3B3B3' : '#666666') }]}>@{item.username}</Text>
                  </View>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={24} color={theme?.primary || '#00B14F'} />
                  ) : (
                    <Ionicons name="add-circle-outline" size={24} color={theme?.primary || '#00B14F'} />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: theme?.textSecondary || (isDarkMode ? '#B3B3B3' : '#666666') }]}>Không tìm thấy người dùng</Text>
                <Text style={[styles.emptySubtext, { color: theme?.textMuted || (isDarkMode ? '#666666' : '#999999') }]}>
                  Thử tìm kiếm với username khác
                </Text>
              </View>
            }
          />
        ) : (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={64} color={theme?.textMuted || (isDarkMode ? '#666666' : '#cccccc')} />
            <Text style={[styles.emptyText, { color: theme?.textSecondary || (isDarkMode ? '#B3B3B3' : '#666666') }]}>Nhập username để tìm kiếm</Text>
            <Text style={[styles.emptySubtext, { color: theme?.textMuted || (isDarkMode ? '#666666' : '#999999') }]}>
              Ví dụ: @username
            </Text>
          </View>
        )
      ) : (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={64} color={theme?.textMuted || (isDarkMode ? '#666666' : '#cccccc')} />
          <Text style={[styles.emptyText, { color: theme?.textSecondary || (isDarkMode ? '#B3B3B3' : '#666666') }]}>Tìm kiếm thành viên</Text>
          <Text style={[styles.emptySubtext, { color: theme?.textMuted || (isDarkMode ? '#666666' : '#999999') }]}>
            Nhập username để tìm và thêm thành viên vào nhóm
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.createButton,
          { backgroundColor: theme?.primary || '#00B14F' },
          creating && styles.createButtonDisabled
        ]}
        onPress={handleCreateGroup}
        disabled={creating}
      >
        {creating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.createButtonText}>Tạo nhóm</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  groupNameInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  selectedContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
  },
  chipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
  },
  chipAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00B14F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  chipAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chipText: {
    fontSize: 14,
    marginRight: 4,
    maxWidth: 100,
  },
  chipRemove: {
    marginLeft: 4,
  },
  searchHint: {
    marginTop: 12,
    fontSize: 14,
  },
  clearButton: {
    padding: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00B14F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userUsername: {
    fontSize: 14,
  },
  createButton: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default CreateGroupScreen;

