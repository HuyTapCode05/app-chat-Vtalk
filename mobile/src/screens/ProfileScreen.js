import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../config/api';
import api from '../config/api';

// Extract emoji from status content (first emoji character)
const extractStatusEmoji = (content) => {
  if (!content) return null;
  // Match first emoji (including multi-byte emojis)
  const emojiMatch = content.match(/^[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u);
  return emojiMatch ? emojiMatch[0] : null;
};

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadStatus();
    }
  }, [user?.id]);

  const loadStatus = async () => {
    try {
      const userId = user?.id || user?._id;
      if (!userId) return;
      
      const res = await api.get(`/posts/user/${userId}/status`);
      if (res.data) {
        setStatus(res.data);
      }
    } catch (error) {
      // Status is optional, so we don't show error
      console.log('No status found or error:', error.message);
    }
  };

  const handleLogout = async () => {
    // On web, use window.confirm for better compatibility
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Bạn có chắc chắn muốn đăng xuất?');
      if (!confirmed) return;
      
      try {
        await logout();
      } catch (error) {
        alert('Không thể đăng xuất. Vui lòng thử lại.');
        console.error('Logout error:', error);
      }
    } else {
      Alert.alert(
        'Đăng xuất',
        'Bạn có chắc chắn muốn đăng xuất?',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Đăng xuất',
            style: 'destructive',
            onPress: async () => {
              try {
                await logout();
              } catch (error) {
                Alert.alert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại.');
                console.error('Logout error:', error);
              }
            },
          },
        ]
      );
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleNotifications = () => {
    navigation.navigate('Settings');
  };

  const handleSecurity = () => {
    navigation.navigate('Security');
  };

  const handleHelp = () => {
    navigation.navigate('Help');
  };

  const avatarUrl = user?.avatar ? (user.avatar.startsWith('http') ? user.avatar : `${BASE_URL}${user.avatar}`) : null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>
                {user?.fullName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          {status && extractStatusEmoji(status.content) && (
            <View style={[styles.statusBadge, { 
              backgroundColor: theme.background, 
              borderColor: theme.primary,
              shadowColor: theme.shadowColor || '#000',
            }]}>
              <Text style={styles.statusEmoji}>{extractStatusEmoji(status.content)}</Text>
            </View>
          )}
        </View>
        <View style={styles.nameContainer}>
          <Text style={[styles.name, { color: theme.text }]}>{user?.fullName || 'User'}</Text>
          {status && extractStatusEmoji(status.content) && (
            <Text style={styles.statusEmojiInline}>{extractStatusEmoji(status.content)}</Text>
          )}
        </View>
        <Text style={[styles.username, { color: theme.textSecondary }]}>@{user?.username || 'username'}</Text>
        <Text style={[styles.email, { color: theme.textMuted }]}>{user?.email || ''}</Text>
        <TouchableOpacity
          style={[styles.viewProfileButton, { borderColor: theme.primary, backgroundColor: theme.primaryLight }]}
          onPress={() => navigation.navigate('PersonalPage', { userId: user?.id })}
        >
          <Ionicons name="person-circle-outline" size={20} color={theme.primary} />
          <Text style={[styles.viewProfileText, { color: theme.primary }]}>Xem trang cá nhân</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { borderTopColor: theme.border }]}>
        <TouchableOpacity 
          style={[styles.menuItem, { borderBottomColor: theme.divider }]}
          onPress={() => navigation.navigate('CreatePost')}
        >
          <Ionicons name="create-outline" size={24} color={theme.primary} />
          <Text style={[styles.menuText, { color: theme.text }]}>Cập nhật trạng thái</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuItem, { borderBottomColor: theme.divider }]}
          onPress={() => navigation.navigate('MyQRCode')}
        >
          <Ionicons name="qr-code-outline" size={24} color={theme.primary} />
          <Text style={[styles.menuText, { color: theme.text }]}>Mã QR của tôi</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuItem, { borderBottomColor: theme.divider }]}
          onPress={() => navigation.navigate('QRScanner')}
        >
          <Ionicons name="scan-outline" size={24} color={theme.primary} />
          <Text style={[styles.menuText, { color: theme.text }]}>Quét mã QR</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.divider }]} onPress={handleEditProfile}>
          <Ionicons name="person-outline" size={24} color={theme.primary} />
          <Text style={[styles.menuText, { color: theme.text }]}>Chỉnh sửa hồ sơ</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.divider }]} onPress={handleNotifications}>
          <Ionicons name="notifications-outline" size={24} color={theme.primary} />
          <Text style={[styles.menuText, { color: theme.text }]}>Thông báo</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.divider }]} onPress={handleSecurity}>
          <Ionicons name="lock-closed-outline" size={24} color={theme.primary} />
          <Text style={[styles.menuText, { color: theme.text }]}>Bảo mật</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.divider }]} onPress={handleHelp}>
          <Ionicons name="help-circle-outline" size={24} color={theme.primary} />
          <Text style={[styles.menuText, { color: theme.text }]}>Trợ giúp</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        </TouchableOpacity>

        {user?.role === 'admin' && (
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: theme.divider }]}
            onPress={() => navigation.navigate('Admin')}
          >
            <Ionicons name="shield" size={24} color={theme.primary} />
            <Text style={[styles.menuText, { color: theme.text }]}>Quản trị</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.section, { borderTopColor: theme.border }]}>
        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.divider }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={theme.error} />
          <Text style={[styles.menuText, styles.logoutText, { color: theme.error }]}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 32,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  statusEmoji: {
    fontSize: 20,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statusEmojiInline: {
    fontSize: 26,
    marginLeft: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '600',
  },
  name: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  username: {
    fontSize: 16,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    marginBottom: 16,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  viewProfileText: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuText: {
    flex: 1,
    fontSize: 17,
    marginLeft: 16,
  },
  logoutText: {
    fontWeight: '500',
  },
});

export default ProfileScreen;

