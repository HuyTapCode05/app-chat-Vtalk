import React from 'react';
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

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();

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
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        <Text style={[styles.name, { color: theme.text }]}>{user?.fullName || 'User'}</Text>
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
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
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

