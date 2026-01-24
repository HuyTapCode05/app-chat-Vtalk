import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api, { BASE_URL } from '../config/api';
import { safeGoBack } from '../utils/helpers';
import storage from '../utils/storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CreateStoryScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { user: currentUser } = useAuth();
  const colors = theme || {};
  const [storyType, setStoryType] = useState('text'); // 'text', 'image', 'video'
  const [content, setContent] = useState('');
  const [mediaUri, setMediaUri] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState('#007AFF');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [loading, setLoading] = useState(false);

  const backgroundColors = [
    '#007AFF', '#FF3B30', '#FF9500', '#FFCC00',
    '#34C759', '#5AC8FA', '#AF52DE', '#FF2D92',
    '#A2845E', '#8E8E93', '#000000', '#FFFFFF'
  ];

  const textColors = [
    '#FFFFFF', '#000000', '#FF3B30', '#007AFF',
    '#34C759', '#FFCC00', '#FF9500', '#AF52DE'
  ];

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh để chọn ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setMediaUri(asset.uri);
        setStoryType(asset.type === 'video' ? 'video' : 'image');
        setContent(''); // Clear text when selecting media
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh/video');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần quyền truy cập camera để chụp ảnh');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setMediaUri(asset.uri);
        setStoryType(asset.type === 'video' ? 'video' : 'image');
        setContent(''); // Clear text when taking photo
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Lỗi', 'Không thể chụp ảnh/quay video');
    }
  };

  const switchToTextMode = () => {
    setStoryType('text');
    setMediaUri(null);
  };

  const createStory = async () => {
    // Check if user is logged in
    if (!currentUser) {
      Alert.alert('Lỗi', 'Bạn cần đăng nhập để tạo story');
      return;
    }

    try {
      setLoading(true);
      console.log('📱 Creating story...', {
        type: storyType,
        hasContent: !!(content && content.trim()),
        hasMedia: !!mediaUri,
        userId: currentUser?.id || currentUser?._id
      });

      const formData = new FormData();
      formData.append('type', storyType);

      if (storyType === 'text') {
        if (!content || !content.trim()) {
          setLoading(false);
          Alert.alert('Lỗi', 'Vui lòng nhập nội dung story');
          return;
        }
        formData.append('content', content.trim());
        formData.append('backgroundColor', backgroundColor);
        formData.append('textColor', textColor);
      } else {
        if (!mediaUri) {
          setLoading(false);
          Alert.alert('Lỗi', 'Vui lòng chọn ảnh hoặc video');
          return;
        }

        // Add media file - format must match React Native FormData requirements
        const fileExtension = storyType === 'image' ? 'jpg' : 'mp4';
        const mimeType = storyType === 'image' ? 'image/jpeg' : 'video/mp4';
        const fileName = `story_${Date.now()}.${fileExtension}`;
        
        // Handle URI for iOS (remove file:// prefix) and Android
        const processedUri = Platform.OS === 'ios' ? mediaUri.replace('file://', '') : mediaUri;
        
        formData.append('media', {
          uri: processedUri,
          type: mimeType,
          name: fileName
        });
        
        console.log('📎 Appending media file:', {
          uri: processedUri,
          type: mimeType,
          name: fileName,
          platform: Platform.OS
        });

        // Add caption if any
        if (content && content.trim()) {
          formData.append('content', content.trim());
        } else {
          // For media stories without caption, send empty string instead of undefined
          formData.append('content', '');
        }
      }

      // Use fetch instead of axios for FormData upload (axios has issues with FormData)
      // Use same storage method as other upload screens for consistency
      const token = await storage.getItem('token');
      
      if (!token) {
        Alert.alert('Lỗi', 'Bạn cần đăng nhập để tạo story');
        setLoading(false);
        return;
      }

      // Ensure BASE_URL is valid
      if (!BASE_URL) {
        console.error('❌ BASE_URL is undefined or empty');
        throw new Error('BASE_URL không được cấu hình');
      }

      const uploadUrl = `${BASE_URL}/api/stories`;
      console.log('📤 Uploading story with fetch...', {
        url: uploadUrl,
        baseUrl: BASE_URL,
        hasToken: !!token,
        tokenLength: token?.length || 0,
        hasFormData: !!formData,
        formDataKeys: formData._parts?.map(p => p[0]) || [],
        storyType: storyType,
        hasMedia: !!mediaUri
      });

      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            // Don't set Content-Type, let fetch set it automatically with boundary
          },
          body: formData,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        const responseText = await response.text();
        console.log('📥 Story upload response:', {
          status: response.status,
          ok: response.ok,
          text: responseText.substring(0, 200)
        });

        if (!response.ok) {
          let errorData;
          try {
            errorData = JSON.parse(responseText);
          } catch {
            errorData = { message: responseText || 'Upload failed' };
          }
          throw new Error(errorData.message || 'Không thể tạo story');
        }

        const result = JSON.parse(responseText);

        if (result.success) {
          console.log('✅ Story created successfully');
          Alert.alert('Thành công', 'Đã đăng story', [
            { text: 'OK', onPress: () => safeGoBack(navigation, 'Home') }
          ]);
        } else {
          throw new Error(result.message || 'Không thể tạo story');
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout. Vui lòng thử lại.');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('❌ Error creating story:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 200)
      });
      
      let message = 'Không thể tạo story';
      if (error.message?.includes('Network request failed')) {
        message = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.';
      } else if (error.message) {
        message = error.message;
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      }
      
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  const renderTextStoryPreview = () => (
    <View style={[
      styles.storyPreview,
      { backgroundColor }
    ]}>
      <Text style={[
        styles.storyPreviewText,
        { color: textColor }
      ]}>
        {content || 'Nhập nội dung story...'}
      </Text>
    </View>
  );

  const renderMediaStoryPreview = () => (
    <View style={styles.storyPreview}>
      {mediaUri && (
        <Image 
          source={{ uri: mediaUri }} 
          style={styles.mediaPreview}
          resizeMode="cover"
        />
      )}
      {content && (
        <View style={styles.captionOverlay}>
          <Text style={styles.captionText}>{content}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background || (isDarkMode ? '#121212' : '#FFFFFF') }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border || (isDarkMode ? '#404040' : '#E0E0E0') }]}>
        <TouchableOpacity onPress={() => safeGoBack(navigation, 'Home')}>
          <Ionicons name="close" size={24} color={colors.text || (isDarkMode ? '#FFFFFF' : '#000000')} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text || (isDarkMode ? '#FFFFFF' : '#000000') }]}>
          Tạo Story
        </Text>
        <TouchableOpacity 
          onPress={createStory}
          disabled={loading}
          style={[
            styles.postButton,
            { 
              backgroundColor: colors.primary || '#007AFF',
              opacity: loading ? 0.5 : 1
            }
          ]}
        >
          <Text style={styles.postButtonText}>
            {loading ? 'Đang đăng...' : 'Đăng'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Story Preview */}
        {storyType === 'text' ? renderTextStoryPreview() : renderMediaStoryPreview()}

        {/* Story Type Selection */}
        <View style={styles.typeSelector}>
          <TouchableOpacity 
            style={[
              styles.typeButton,
              { 
                backgroundColor: storyType === 'text' ? (colors.primary || '#007AFF') : (colors.card || (isDarkMode ? '#2D2D2D' : '#F5F5F5')),
                borderColor: colors.border || (isDarkMode ? '#404040' : '#E0E0E0')
              }
            ]}
            onPress={switchToTextMode}
          >
            <Ionicons 
              name="text" 
              size={20} 
              color={storyType === 'text' ? (colors.background || (isDarkMode ? '#121212' : '#FFFFFF')) : (colors.text || (isDarkMode ? '#FFFFFF' : '#000000'))} 
            />
            <Text style={[
              styles.typeButtonText,
              { color: storyType === 'text' ? (colors.background || (isDarkMode ? '#121212' : '#FFFFFF')) : (colors.text || (isDarkMode ? '#FFFFFF' : '#000000')) }
            ]}>
              Text
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.typeButton, { backgroundColor: colors.card || (isDarkMode ? '#2D2D2D' : '#F5F5F5'), borderColor: colors.border || (isDarkMode ? '#404040' : '#E0E0E0') }]}
            onPress={pickImage}
          >
            <Ionicons name="image" size={20} color={colors.text || (isDarkMode ? '#FFFFFF' : '#000000')} />
            <Text style={[styles.typeButtonText, { color: colors.text || (isDarkMode ? '#FFFFFF' : '#000000') }]}>
              Thư viện
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.typeButton, { backgroundColor: colors.card || (isDarkMode ? '#2D2D2D' : '#F5F5F5'), borderColor: colors.border || (isDarkMode ? '#404040' : '#E0E0E0') }]}
            onPress={takePhoto}
          >
            <Ionicons name="camera" size={20} color={colors.text || (isDarkMode ? '#FFFFFF' : '#000000')} />
            <Text style={[styles.typeButtonText, { color: colors.text || (isDarkMode ? '#FFFFFF' : '#000000') }]}>
              Camera
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Input */}
        <View style={[styles.inputContainer, { backgroundColor: colors.card || (isDarkMode ? '#2D2D2D' : '#F5F5F5') }]}>
          <TextInput
            style={[styles.contentInput, { color: colors.text || (isDarkMode ? '#FFFFFF' : '#000000') }]}
            placeholder={storyType === 'text' ? "What's on your mind?" : "Thêm chú thích..."}
            placeholderTextColor={colors.textSecondary || (isDarkMode ? '#666666' : '#999999')}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={500}
          />
          <Text style={[styles.charCount, { color: colors.textSecondary || (isDarkMode ? '#666666' : '#999999') }]}>
            {content.length}/500
          </Text>
        </View>

        {/* Text Story Customization */}
        {storyType === 'text' && (
          <View style={styles.customization}>
            {/* Background Colors */}
            <View style={styles.customizationSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Màu nền
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.colorPalette}>
                  {backgroundColors.map((color, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.colorButton,
                        { backgroundColor: color },
                        backgroundColor === color && styles.selectedColor
                      ]}
                      onPress={() => setBackgroundColor(color)}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Text Colors */}
            <View style={styles.customizationSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Màu chữ
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.colorPalette}>
                  {textColors.map((color, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.colorButton,
                        { backgroundColor: color },
                        textColor === color && styles.selectedColor,
                        color === '#FFFFFF' && { borderWidth: 1, borderColor: colors.border }
                      ]}
                      onPress={() => setTextColor(color)}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        )}
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
  storyPreview: {
    width: screenWidth - 100,
    height: (screenWidth - 100) * 16/9,
    alignSelf: 'center',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  storyPreviewText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },
  captionOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 10,
  },
  captionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  typeButton: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 80,
  },
  typeButtonText: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: '500',
  },
  inputContainer: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  contentInput: {
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    marginTop: 5,
  },
  customization: {
    marginTop: 10,
  },
  customizationSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  colorPalette: {
    flexDirection: 'row',
    paddingHorizontal: 5,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#007AFF',
    borderWidth: 3,
  },
});

export default CreateStoryScreen;