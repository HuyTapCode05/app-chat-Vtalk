import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import { safeGoBack } from '../utils/helpers';

const CreatePostScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { user: currentUser } = useAuth();
  const colors = theme || {};
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const createPost = async () => {
    if (!currentUser) {
      Alert.alert('Lỗi', 'Bạn cần đăng nhập để đăng trạng thái');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập nội dung trạng thái');
      return;
    }

    try {
      setLoading(true);

      const response = await api.post('/posts', {
        content: content.trim()
      });

      if (response.data) {
        Alert.alert('Thành công', 'Đã đăng trạng thái', [
          { text: 'OK', onPress: () => safeGoBack(navigation, 'Profile') }
        ]);
      }
    } catch (error) {
      console.error('❌ Error creating post:', error);
      let message = 'Không thể đăng trạng thái';
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background || (isDarkMode ? '#121212' : '#FFFFFF') }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border || (isDarkMode ? '#404040' : '#E0E0E0') }]}>
        <TouchableOpacity onPress={() => safeGoBack(navigation, 'Profile')}>
          <Ionicons name="close" size={24} color={colors.text || (isDarkMode ? '#FFFFFF' : '#000000')} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text || (isDarkMode ? '#FFFFFF' : '#000000') }]}>
          Đăng trạng thái
        </Text>
        <TouchableOpacity 
          onPress={createPost}
          disabled={loading || !content.trim()}
          style={[
            styles.postButton,
            { 
              backgroundColor: colors.primary || '#007AFF',
              opacity: (loading || !content.trim()) ? 0.5 : 1
            }
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.postButtonText}>Đăng</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Info */}
        <View style={styles.userInfo}>
          {currentUser?.avatar ? (
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarEmoji}>👤</Text>
            </View>
          ) : (
            <View style={[styles.avatarContainer, { backgroundColor: colors.primary || '#007AFF' }]}>
              <Text style={styles.avatarText}>
                {currentUser?.fullName?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: colors.text || (isDarkMode ? '#FFFFFF' : '#000000') }]}>
              {currentUser?.fullName || currentUser?.username || 'User'}
            </Text>
            <Text style={[styles.postTime, { color: colors.textSecondary || (isDarkMode ? '#666666' : '#999999') }]}>
              Bây giờ
            </Text>
          </View>
        </View>

        {/* Content Input */}
        <TextInput
          style={[styles.contentInput, { color: colors.text || (isDarkMode ? '#FFFFFF' : '#000000') }]}
          placeholder="Bạn đang nghĩ gì?"
          placeholderTextColor={colors.textSecondary || (isDarkMode ? '#666666' : '#999999')}
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={5000}
          autoFocus
        />

        {/* Character Count */}
        <Text style={[styles.charCount, { color: colors.textSecondary || (isDarkMode ? '#666666' : '#999999') }]}>
          {content.length}/5000
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  postButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  content: {
    padding: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  avatarEmoji: {
    fontSize: 30,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  postTime: {
    fontSize: 12,
  },
  contentInput: {
    fontSize: 16,
    minHeight: 200,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
  },
});

export default CreatePostScreen;

