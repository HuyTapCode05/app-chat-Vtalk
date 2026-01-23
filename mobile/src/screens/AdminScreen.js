import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../config/api';
import { Ionicons } from '@expo/vector-icons';
import { safeGoBack } from '../utils/helpers';

const AdminScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('stats'); // 'stats', 'users', 'conversations', 'posts'
  const [searchQuery, setSearchQuery] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadData();
    } else {
      Alert.alert('Không có quyền', 'Bạn không có quyền truy cập trang này');
      safeGoBack(navigation, 'Home');
    }
  }, [user]);

  const loadData = async () => {
    try {
      if (activeTab === 'stats') {
        await loadStats();
      } else if (activeTab === 'users') {
        await loadUsers();
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.get('/admin/users', {
        params: {
          page: usersPage,
          limit: 20,
          search: searchQuery,
        },
      });
      setUsers(res.data.users || []);
      setUsersTotalPages(res.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDeleteUser = async (userId, userName) => {
    Alert.alert(
      'Xóa người dùng',
      `Bạn có chắc chắn muốn xóa người dùng "${userName}"? Hành động này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/users/${userId}`);
              Alert.alert('Thành công', 'Đã xóa người dùng');
              loadUsers();
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa người dùng');
            }
          },
        },
      ]
    );
  };

  const handleUpdateUserRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await api.put(`/admin/users/${userId}`, { role: newRole });
      Alert.alert('Thành công', `Đã ${newRole === 'admin' ? 'thăng cấp' : 'hạ cấp'} người dùng`);
      loadUsers();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật quyền người dùng');
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab, usersPage, searchQuery]);

  if (loading && !stats) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const renderStats = () => {
    if (!stats) return null;

    const StatCard = ({ title, value, icon, color }) => (
      <View style={[styles.statCard, { backgroundColor: theme.card }]}>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
        <Text style={[styles.statTitle, { color: theme.textSecondary }]}>{title}</Text>
      </View>
    );

    return (
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.primary]} />
        }
      >
        <View style={styles.statsGrid}>
          <StatCard
            title="Tổng người dùng"
            value={stats.users?.total || 0}
            icon="people"
            color={theme.primary}
          />
          <StatCard
            title="Đang online"
            value={stats.users?.online || 0}
            icon="radio-button-on"
            color={theme.success}
          />
          <StatCard
            title="Cuộc trò chuyện"
            value={stats.conversations || 0}
            icon="chatbubbles"
            color={theme.info}
          />
          <StatCard
            title="Tin nhắn"
            value={stats.messages || 0}
            icon="mail"
            color={theme.warning}
          />
          <StatCard
            title="Bài viết"
            value={stats.posts || 0}
            icon="document-text"
            color={theme.primary}
          />
          <StatCard
            title="Stories"
            value={stats.stories || 0}
            icon="images"
            color={theme.success}
          />
        </View>
      </ScrollView>
    );
  };

  const renderUsers = () => {
    return (
      <View style={styles.content}>
        <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Tìm kiếm người dùng..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.primary]} />
          }
        >
          {users.map((userItem) => (
            <View key={userItem.id} style={[styles.userCard, { backgroundColor: theme.card }]}>
              <View style={styles.userInfo}>
                <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                  <Text style={styles.avatarText}>
                    {userItem.fullName?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={styles.userDetails}>
                  <Text style={[styles.userName, { color: theme.text }]}>
                    {userItem.fullName || 'User'}
                  </Text>
                  <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
                    {userItem.email}
                  </Text>
                  <View style={styles.userMeta}>
                    {userItem.isOnline ? (
                      <View style={styles.onlineBadge}>
                        <Text style={styles.onlineText}>Đang online</Text>
                      </View>
                    ) : (
                      <Text style={[styles.offlineText, { color: theme.textMuted }]}>Offline</Text>
                    )}
                    {userItem.role === 'admin' && (
                      <View style={[styles.adminBadge, { backgroundColor: theme.primary + '20' }]}>
                        <Text style={[styles.adminText, { color: theme.primary }]}>ADMIN</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.userActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.primary + '20' }]}
                  onPress={() => handleUpdateUserRole(userItem.id, userItem.role)}
                >
                  <Ionicons
                    name={userItem.role === 'admin' ? 'shield' : 'shield-outline'}
                    size={20}
                    color={theme.primary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.error + '20' }]}
                  onPress={() => handleDeleteUser(userItem.id, userItem.fullName)}
                >
                  <Ionicons name="trash-outline" size={20} color={theme.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {users.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={64} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Không tìm thấy người dùng
              </Text>
            </View>
          )}

          {usersTotalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageButton, { backgroundColor: theme.card }]}
                onPress={() => setUsersPage(Math.max(1, usersPage - 1))}
                disabled={usersPage === 1}
              >
                <Ionicons name="chevron-back" size={20} color={theme.primary} />
              </TouchableOpacity>
              <Text style={[styles.pageText, { color: theme.text }]}>
                Trang {usersPage} / {usersTotalPages}
              </Text>
              <TouchableOpacity
                style={[styles.pageButton, { backgroundColor: theme.card }]}
                onPress={() => setUsersPage(Math.min(usersTotalPages, usersPage + 1))}
                disabled={usersPage === usersTotalPages}
              >
                <Ionicons name="chevron-forward" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.card }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <Ionicons
            name="stats-chart"
            size={20}
            color={activeTab === 'stats' ? theme.primary : theme.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'stats' ? theme.primary : theme.textSecondary },
            ]}
          >
            Thống kê
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <Ionicons
            name="people"
            size={20}
            color={activeTab === 'users' ? theme.primary : theme.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'users' ? theme.primary : theme.textSecondary },
            ]}
          >
            Người dùng
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'stats' && renderStats()}
      {activeTab === 'users' && renderUsers()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#00B14F',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    margin: 16,
    borderRadius: 10,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  userCard: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 4,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  onlineText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  offlineText: {
    fontSize: 12,
  },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  adminText: {
    fontSize: 10,
    fontWeight: '700',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  pageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default AdminScreen;

