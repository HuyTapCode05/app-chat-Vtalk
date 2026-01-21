import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  PanGesturer,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api, { BASE_URL } from '../config/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const StoryViewer = ({ route, navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { user: currentUser } = useAuth();
  const colors = theme || {};
  const { userStoryGroup, startIndex = 0 } = route.params;
  
  const [currentStoryIndex, setCurrentStoryIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  const { user, stories, isOwn } = userStoryGroup;
  const currentStory = stories[currentStoryIndex];

  useEffect(() => {
    startStoryTimer();
    markStoryAsViewed();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentStoryIndex]);

  const startStoryTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setProgress(0);
    progressAnim.setValue(0);

    // Start progress animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 5000, // 5 seconds per story
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !paused) {
        goToNextStory();
      }
    });

    // Update progress for visual feedback
    timerRef.current = setInterval(() => {
      if (!paused) {
        setProgress(prev => {
          const newProgress = prev + 0.02; // 2% every 100ms = 5 seconds total
          if (newProgress >= 1) {
            clearInterval(timerRef.current);
            return 1;
          }
          return newProgress;
        });
      }
    }, 100);
  };

  const markStoryAsViewed = async () => {
    if (!isOwn && currentStory) {
      try {
        await api.post(`/stories/${currentStory.id}/view`);
        console.log('✅ Story viewed:', currentStory.id);
      } catch (error) {
        console.error('❌ Error marking story as viewed:', error);
      }
    }
  };

  const goToNextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else {
      navigation.goBack();
    }
  };

  const goToPreviousStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else {
      navigation.goBack();
    }
  };

  const togglePause = () => {
    setPaused(!paused);
    if (paused) {
      startStoryTimer();
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      progressAnim.stopAnimation();
    }
  };

  const handleTap = (event) => {
    const { locationX } = event.nativeEvent;
    const threshold = screenWidth / 2;
    
    if (locationX > threshold) {
      goToNextStory();
    } else {
      goToPreviousStory();
    }
  };

  const viewStoryViewers = async () => {
    if (!isOwn) return;
    
    try {
      const response = await api.get(`/stories/${currentStory.id}/viewers`);
      if (response.data.success) {
        const viewers = response.data.viewers;
        Alert.alert(
          'Đã xem story',
          `${viewers.length} người đã xem\n${viewers.map(v => v.viewer.fullName).join('\n')}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error getting story viewers:', error);
      Alert.alert('Lỗi', 'Không thể lấy danh sách người xem');
    }
  };

  const deleteStory = async () => {
    if (!isOwn) return;

    Alert.alert(
      'Xóa story',
      'Bạn có chắc chắn muốn xóa story này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/stories/${currentStory.id}`);
              console.log('✅ Story deleted');
              
              // Remove story from list and continue
              const updatedStories = stories.filter((_, index) => index !== currentStoryIndex);
              if (updatedStories.length === 0) {
                navigation.goBack();
              } else if (currentStoryIndex >= updatedStories.length) {
                setCurrentStoryIndex(updatedStories.length - 1);
              }
            } catch (error) {
              console.error('❌ Error deleting story:', error);
              Alert.alert('Lỗi', 'Không thể xóa story');
            }
          }
        }
      ]
    );
  };

  const renderStoryContent = () => {
    if (!currentStory) return null;

    switch (currentStory.type) {
      case 'text':
        return (
          <View style={[
            styles.textStoryContainer,
            { backgroundColor: currentStory.backgroundColor || colors.primary }
          ]}>
            <Text style={[
              styles.textStoryContent,
              { color: currentStory.textColor || colors.background }
            ]}>
              {currentStory.content}
            </Text>
          </View>
        );

      case 'image':
        return (
          <Image
            source={{ uri: `${BASE_URL}${currentStory.mediaUrl}` }}
            style={styles.mediaContent}
            resizeMode="cover"
          />
        );

      case 'video':
        return (
          <Video
            source={{ uri: `${BASE_URL}${currentStory.mediaUrl}` }}
            style={styles.mediaContent}
            shouldPlay={!paused}
            isLooping
            resizeMode="cover"
          />
        );

      default:
        return null;
    }
  };

  if (!currentStory) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background || (isDarkMode ? '#121212' : '#000000') }]}>
        <Text style={[styles.errorText, { color: colors.text || (isDarkMode ? '#FFFFFF' : '#FFFFFF') }]}>
          Không tìm thấy story
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Story Content */}
      <TouchableOpacity 
        style={styles.storyContent} 
        onPress={handleTap}
        onLongPress={togglePause}
        activeOpacity={0.9}
      >
        {renderStoryContent()}
        
        {/* Caption for media stories */}
        {currentStory.content && currentStory.type !== 'text' && (
          <View style={styles.captionContainer}>
            <Text style={styles.captionText}>{currentStory.content}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Progress bars */}
      <View style={styles.progressContainer}>
        {stories.map((_, index) => (
          <View key={index} style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: index === currentStoryIndex 
                    ? progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      })
                    : index < currentStoryIndex ? '100%' : '0%'
                }
              ]}
            />
          </View>
        ))}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {user.avatar ? (
            <Image
              source={{ uri: `${BASE_URL}${user.avatar}` }}
              style={styles.userAvatar}
            />
          ) : (
            <View style={[styles.userAvatar, { backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                {user.fullName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {isOwn ? 'Your story' : user.fullName}
            </Text>
            <Text style={styles.storyTime}>
              {formatTime(currentStory.createdAt)}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          {isOwn && (
            <>
              <TouchableOpacity onPress={viewStoryViewers} style={styles.actionButton}>
                <Ionicons name="eye" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={deleteStory} style={styles.actionButton}>
                <Ionicons name="trash" size={24} color="white" />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.actionButton}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Pause indicator */}
      {paused && (
        <View style={styles.pauseIndicator}>
          <Ionicons name="pause" size={40} color="white" />
        </View>
      )}
    </View>
  );
};

const formatTime = (timestamp) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInHours = Math.floor((now - time) / (1000 * 60 * 60));
  
  if (diffInHours < 1) {
    return 'Vừa xong';
  } else if (diffInHours < 24) {
    return `${diffInHours} giờ trước`;
  } else {
    return `${Math.floor(diffInHours / 24)} ngày trước`;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  storyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textStoryContainer: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  textStoryContent: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 36,
  },
  mediaContent: {
    width: screenWidth,
    height: screenHeight,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 10,
  },
  captionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  progressContainer: {
    position: 'absolute',
    top: 50,
    left: 15,
    right: 15,
    flexDirection: 'row',
    zIndex: 1,
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 2,
    borderRadius: 1.5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 1.5,
  },
  header: {
    position: 'absolute',
    top: 70,
    left: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  storyTime: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  pauseIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    backgroundColor: 'rgba(0,0,0,0.7)',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
});

export default StoryViewer;