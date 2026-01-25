import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api, { BASE_URL } from '../config/api';
import { safeGoBack } from '../utils/helpers';
import storage from '../utils/storage';

const CreatePostScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { user: currentUser } = useAuth();
  const colors = theme || {};
  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1.0,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần quyền truy cập camera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1.0,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Lỗi', 'Không thể chụp ảnh');
    }
  };

  const removeImage = () => {
    setImageUri(null);
  };

  const createPost = async () => {
    if (!currentUser) {
      Alert.alert('Lỗi', 'Bạn cần đăng nhập để đăng trạng thái');
      return;
    }

    if (!content.trim() && !imageUri) {
      Alert.alert('Lỗi', 'Vui lòng nhập nội dung hoặc chọn ảnh');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      if (content.trim()) {
        formData.append('content', content.trim());
      }

      if (imageUri) {
        const processedUri = Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri;
        const fileName = `post_${Date.now()}.jpg`;
        
        formData.append('image', {
          uri: processedUri,
          type: 'image/jpeg',
          name: fileName
        });
      }

      const token = await storage.getItem('token');
      if (!token) {
        Alert.alert('Lỗi', 'Bạn cần đăng nhập');
        setLoading(false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        const response = await fetch(`${BASE_URL}/api/posts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseText = await response.text();
        
        if (!response.ok) {
          let errorData;
          try {
            errorData = JSON.parse(responseText);
          } catch {
            errorData = { message: responseText || 'Upload failed' };
          }
          throw new Error(errorData.message || 'Không thể đăng trạng thái');
        }

        const result = JSON.parse(responseText);

        Alert.alert('Thành công', 'Đã đăng trạng thái', [
          { text: 'OK', onPress: () => safeGoBack(navigation, 'Home') }
        ]);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout. Vui lòng thử lại.');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('❌ Error creating post:', error);
      let message = 'Không thể đăng trạng thái';
      if (error.message?.includes('Network request failed')) {
        message = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.';
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
        <TouchableOpacity onPress={() => safeGoBack(navigation, 'Home')}>
          <Ionicons name="close" size={24} color={colors.text || (isDarkMode ? '#FFFFFF' : '#000000')} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text || (isDarkMode ? '#FFFFFF' : '#000000') }]}>
          Đăng trạng thái
        </Text>
        <TouchableOpacity 
          onPress={createPost}
          disabled={loading}
          style={[
            styles.postButton,
            { 
              backgroundColor: colors.primary || '#007AFF',
              opacity: loading ? 0.5 : 1
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
            <Image 
              source={{ uri: currentUser.avatar }} 
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primary || '#007AFF' }]}>
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
        />

        {/* Image Preview */}
        {imageUri && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
            <TouchableOpacity 
              style={styles.removeImageButton}
              onPress={removeImage}
            >
              <Ionicons name="close-circle" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Actions */}
        <View style={[styles.actionsContainer, { backgroundColor: colors.card || (isDarkMode ? '#2D2D2D' : '#F5F5F5') }]}>
          <Text style={[styles.actionsTitle, { color: colors.text || (isDarkMode ? '#FFFFFF' : '#000000') }]}>
            Thêm vào bài viết
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, { borderColor: colors.border || (isDarkMode ? '#404040' : '#E0E0E0') }]}
              onPress={pickImage}
            >
              <Ionicons name="image-outline" size={24} color={colors.primary || '#007AFF'} />
              <Text style={[styles.actionButtonText, { color: colors.text || (isDarkMode ? '#FFFFFF' : '#000000') }]}>
                Ảnh
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { borderColor: colors.border || (isDarkMode ? '#404040' : '#E0E0E0') }]}
              onPress={takePhoto}
            >
              <Ionicons name="camera-outline" size={24} color={colors.primary || '#007AFF'} />
              <Text style={[styles.actionButtonText, { color: colors.text || (isDarkMode ? '#FFFFFF' : '#000000') }]}>
                Camera
              </Text>
            </TouchableOpacity>
          </View>
        </View>

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
  avatar: {
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
    minHeight: 150,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
  },
  actionsContainer: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  actionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
  },
});

export default CreatePostScreen;

