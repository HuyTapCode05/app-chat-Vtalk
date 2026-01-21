import React, { useState, useEffect, useContext, forwardRef, useImperativeHandle } from 'react';
import { 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Text, 
  Image, 
  StyleSheet, 
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api, { BASE_URL } from '../config/api';

const StoryList = forwardRef(({ onCreateStory, onViewStory, refreshTrigger }, ref) => {
  const { theme, isDarkMode } = useTheme();
  const { user: currentUser } = useAuth();
  const colors = theme || {};
  const [storiesData, setStoriesData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStories();
  }, [refreshTrigger]);

  const loadStories = async () => {
    try {
      setLoading(true);
      console.log('📱 Loading stories...');
      
      const response = await api.get('/stories');
      
      if (response.data.success) {
        setStoriesData(response.data.stories);
        console.log(`✅ Loaded ${response.data.stories.length} story groups`);
      }
    } catch (error) {
      console.error('❌ Error loading stories:', error);
      Alert.alert('Lỗi', 'Không thể tải stories');
    } finally {
      setLoading(false);
    }
  };

  // Expose refresh method via ref
  useImperativeHandle(ref, () => ({
    refresh: loadStories
  }));

  const handleCreateStory = () => {
    onCreateStory?.();
  };

  const handleViewUserStories = (userStoryGroup) => {
    onViewStory?.(userStoryGroup);
  };

  const renderCreateStoryButton = () => (
    <TouchableOpacity 
      style={[styles.storyItem]}
      onPress={handleCreateStory}
      activeOpacity={0.7}
    >
      <View style={[styles.storyImageContainer, styles.createStoryContainer]}>
        <View style={[styles.addButton, { backgroundColor: '#42A5F5' }]}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </View>
      </View>
      <Text style={[styles.storyUsername, { color: isDarkMode ? '#E0E0E0' : '#1C1E21', fontWeight: '500' }]} numberOfLines={1}>
        Tạo Story
      </Text>
    </TouchableOpacity>
  );

  const renderStoryItem = (userStoryGroup, index) => {
    const { user, stories, isOwn, hasUnviewedStories } = userStoryGroup;
    const latestStory = stories && stories[0]; // Stories are sorted by latest first
    
    if (!user || !stories || !latestStory) {
      return null;
    }
    
    return (
      <TouchableOpacity 
        key={user.id}
        style={styles.storyItem}
        onPress={() => handleViewUserStories(userStoryGroup)}
        activeOpacity={0.7}
      >
        <View style={styles.storyImageContainer}>
          {/* Story ring indicator */}
          <View style={[
            styles.storyRing,
            { 
              borderColor: hasUnviewedStories ? colors.primary : colors.border,
              borderWidth: hasUnviewedStories ? 3 : 2
            }
          ]}>
            {/* User avatar or story preview */}
            {latestStory.type === 'image' && latestStory.mediaUrl ? (
              <Image 
                source={{ uri: `${BASE_URL}${latestStory.mediaUrl}` }}
                style={styles.storyPreviewImage}
                resizeMode="cover"
              />
            ) : latestStory.type === 'text' ? (
              <View style={[
                styles.textStoryPreview,
                { backgroundColor: latestStory.backgroundColor || colors.primary }
              ]}>
                <Text 
                  style={[
                    styles.textStoryPreviewText,
                    { color: latestStory.textColor || colors.background }
                  ]}
                  numberOfLines={3}
                >
                  {latestStory.content}
                </Text>
              </View>
            ) : (
              <View style={[styles.storyPreviewImage, { backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={[styles.avatarText, { color: colors.textSecondary }]}>
                  {user && user.fullName ? user.fullName.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
          </View>
          
          {/* Story count indicator */}
          {stories.length > 1 && (
            <View style={[styles.storyCountBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.storyCountText, { color: colors.background }]}>
                {stories.length}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={[styles.storyUsername, { color: isDarkMode ? '#E0E0E0' : '#1C1E21', fontWeight: '500' }]} numberOfLines={1}>
          {isOwn ? 'Nhật ký của bạn' : (user && user.fullName ? user.fullName : 'Người dùng')}
        </Text>
      </TouchableOpacity>
    );
  };

  if (storiesData.length === 0 && !loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background || '#FFFFFF' }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {renderCreateStoryButton()}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background || '#FFFFFF' }]}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderCreateStoryButton()}
        {storiesData && storiesData.map((userStoryGroup, index) => {
          if (userStoryGroup && userStoryGroup.user && userStoryGroup.stories) {
            return renderStoryItem(userStoryGroup, index);
          }
          return null;
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 15,
    paddingHorizontal: 5,
    marginVertical: 0,
  },
  scrollContent: {
    paddingHorizontal: 15,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 15,
    width: 70,
  },
  storyImageContainer: {
    position: 'relative',
    marginBottom: 5,
  },
  createStoryContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyPreviewImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  textStoryPreview: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  textStoryPreviewText: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyCountBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyCountText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  storyUsername: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 70,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default StoryList;