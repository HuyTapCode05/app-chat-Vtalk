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

// Preset statuses
const EMOTION_STATUSES = [
  { emoji: '😊', text: 'Vui vẻ' },
  { emoji: '❤️', text: 'Đang yêu' },
  { emoji: '😲', text: 'Ngạc nhiên' },
  { emoji: '😢', text: 'Buồn quá' },
  { emoji: '😠', text: 'Tức giận' },
  { emoji: '😴', text: 'Buồn ngủ' },
  { emoji: '🔋', text: 'Hết pin' },
  { emoji: '⏳', text: 'Lag...lag' },
];

const ACTIVITY_STATUSES = [
  { emoji: '💼', text: 'Làm việc' },
  { emoji: '📚', text: 'Học bài' },
  { emoji: '⏰', text: 'Bận rộn' },
  { emoji: '💭', text: 'Suy nghĩ' },
  { emoji: '🏃', text: 'Chạy thôi!' },
  { emoji: '💊', text: 'Bệnh rồi' },
  { emoji: '🏖️', text: 'Nghỉ phép' },
  { emoji: '👀', text: 'Hóng hớt' },
  { emoji: '🍀', text: 'May mắn' },
  { emoji: '🙏', text: 'Cầu nguyện' },
  { emoji: '🧘', text: 'Tịnh tâm' },
  { emoji: '🎮', text: 'Chơi game' },
];

const GENERAL_STATUSES = [
  { emoji: '🏆', text: 'Vô địch!' },
  { emoji: '⚽', text: 'Máu lửa' },
  { emoji: '💥', text: 'Bùng nổ' },
];

const CreatePostScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { user: currentUser } = useAuth();
  const colors = theme || {};
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const selectStatus = (status) => {
    setContent(status.emoji + ' ' + status.text);
  };

  const createPost = async () => {
    if (!currentUser) {
      Alert.alert('Lỗi', 'Bạn cần đăng nhập để đăng trạng thái');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Lỗi', 'Vui lòng chọn hoặc nhập trạng thái');
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

  const renderStatusButton = (status, index) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.statusButton,
        { 
          backgroundColor: colors.card || (isDarkMode ? '#2D2D2D' : '#F5F5F5'),
          borderColor: colors.border || (isDarkMode ? '#404040' : '#E0E0E0')
        }
      ]}
      onPress={() => selectStatus(status)}
    >
      <Text style={styles.statusEmoji}>{status.emoji}</Text>
      <Text style={[styles.statusText, { color: colors.text || (isDarkMode ? '#FFFFFF' : '#000000') }]}>
        {status.text}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background || (isDarkMode ? '#121212' : '#FFFFFF') }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border || (isDarkMode ? '#404040' : '#E0E0E0') }]}>
        <TouchableOpacity onPress={() => safeGoBack(navigation, 'Profile')}>
          <Ionicons name="close" size={24} color={colors.text || (isDarkMode ? '#FFFFFF' : '#000000')} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text || (isDarkMode ? '#FFFFFF' : '#000000') }]}>
            Cập nhật trạng thái
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary || (isDarkMode ? '#666666' : '#999999') }]}>
            Hiển thị trong 24 giờ
          </Text>
        </View>
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
        {/* Selected Status Preview */}
        {content.trim() && (
          <View style={[styles.previewContainer, { backgroundColor: colors.card || (isDarkMode ? '#2D2D2D' : '#F5F5F5') }]}>
            <Text style={[styles.previewText, { color: colors.text || (isDarkMode ? '#FFFFFF' : '#000000') }]}>
              {content}
            </Text>
            <TouchableOpacity onPress={() => setContent('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary || (isDarkMode ? '#666666' : '#999999')} />
            </TouchableOpacity>
          </View>
        )}

        {/* General Statuses */}
        <View style={styles.statusSection}>
          <View style={styles.statusRow}>
            {GENERAL_STATUSES.map((status, index) => renderStatusButton(status, index))}
          </View>
        </View>

        {/* Emotions Section */}
        <View style={styles.statusSection}>
          <Text style={[styles.sectionTitle, { color: colors.text || (isDarkMode ? '#FFFFFF' : '#000000') }]}>
            Cảm xúc
          </Text>
          <View style={styles.statusGrid}>
            {EMOTION_STATUSES.map((status, index) => renderStatusButton(status, index))}
          </View>
        </View>

        {/* Activities Section */}
        <View style={styles.statusSection}>
          <Text style={[styles.sectionTitle, { color: colors.text || (isDarkMode ? '#FFFFFF' : '#000000') }]}>
            Hoạt động
          </Text>
          <View style={styles.statusGrid}>
            {ACTIVITY_STATUSES.map((status, index) => renderStatusButton(status, index))}
          </View>
        </View>

        {/* Custom Input */}
        <View style={[styles.customInputSection, { backgroundColor: colors.card || (isDarkMode ? '#2D2D2D' : '#F5F5F5') }]}>
          <Text style={[styles.sectionTitle, { color: colors.text || (isDarkMode ? '#FFFFFF' : '#000000') }]}>
            Tùy chỉnh
          </Text>
          <TextInput
            style={[styles.customInput, { 
              color: colors.text || (isDarkMode ? '#FFFFFF' : '#000000'),
              borderColor: colors.border || (isDarkMode ? '#404040' : '#E0E0E0')
            }]}
            placeholder="Nhập trạng thái tùy chỉnh..."
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
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
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  previewText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  clearButton: {
    marginLeft: 10,
  },
  statusSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusButton: {
    width: '30%',
    aspectRatio: 1.2,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  statusEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  customInputSection: {
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  customInput: {
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    marginTop: 8,
  },
});

export default CreatePostScreen;

