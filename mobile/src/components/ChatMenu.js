import React, { useState, useEffect, memo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api, { BASE_URL } from '../config/api';
import { handleApiError, showAlert } from '../utils/errorHandler';
import storage from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';

/**
 * ChatMenu Component - Zalo style
 * Bottom sheet menu for chat options
 */
const ChatMenu = memo(({ visible, onClose, conversation, currentUserId, onWallpaperChange, onViewCommonGroups, onNameChange, onDissolve, onConversationUpdate }) => {
  const [activeView, setActiveView] = useState('main'); // 'main', 'wallpaper', 'members', 'name'
  const [wallpaper, setWallpaper] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [uploadingWallpaper, setUploadingWallpaper] = useState(false);

  const conversationId = conversation?._id || conversation?.id;
  const isGroup = conversation?.type === 'group';
  const participants = conversation?.participants || [];
  const admins = conversation?.admins || [];
  // Owner is first admin; fallback to first participant for legacy
  const adminIds = admins.map(a => (typeof a === 'object' ? (a._id || a.id) : a));
  const firstParticipantId = participants.length > 0 
    ? (typeof participants[0] === 'object' ? (participants[0]._id || participants[0].id) : participants[0])
    : null;
  const ownerId = adminIds[0] || firstParticipantId;
  const isOwnerCurrentUser = isGroup && ownerId && String(ownerId) === String(currentUserId);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setActiveView('main');
      setWallpaper(conversation?.wallpaper || null);
      setGroupName(conversation?.name || '');
    } else {
      setActiveView('main');
      setMembers([]);
    }
  }, [visible, conversation]);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Cần quyền truy cập thư viện ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'images',
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await handleSetWallpaper(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const handleSetWallpaper = async (imageUri) => {
    setUploadingWallpaper(true);
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      // Format FormData based on platform
      if (Platform.OS === 'web') {
        // For web, need to convert to blob first
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append('wallpaper', blob, filename || 'wallpaper.jpg');
      } else {
        // For mobile (iOS/Android)
        formData.append('wallpaper', {
          uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
          name: filename || 'wallpaper.jpg',
          type: type || 'image/jpeg',
        });
      }

      // Use fetch API directly for FormData (like ChatScreen does for images)
      const token = await storage.getItem(STORAGE_KEYS.TOKEN);
      const res = await fetch(`${BASE_URL}/api/conversations/${conversationId}/wallpaper`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - browser will set it automatically with boundary
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(errorData.message || 'Upload failed');
      }

      const data = await res.json();
      setWallpaper(data.wallpaper);
      if (onWallpaperChange) onWallpaperChange(data.wallpaper);
      setActiveView('main');
      Alert.alert('Thành công', 'Đã đổi ảnh nền');
    } catch (error) {
      console.error('Error setting wallpaper:', error);
      Alert.alert('Lỗi', error.message || 'Không thể đổi ảnh nền');
    } finally {
      setUploadingWallpaper(false);
    }
  };

  const handleRemoveWallpaper = async () => {
    try {
      await api.delete(`/conversations/${conversationId}/wallpaper`);
      setWallpaper(null);
      if (onWallpaperChange) onWallpaperChange(null);
      setActiveView('main');
      Alert.alert('Thành công', 'Đã xóa ảnh nền');
    } catch (error) {
      console.error('Error removing wallpaper:', error);
      Alert.alert('Lỗi', 'Không thể xóa ảnh nền');
    }
  };

  const handleChangeGroupName = async () => {
    if (!groupName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm');
      return;
    }

    try {
      await api.put(`/conversations/${conversationId}/name`, {
        name: groupName.trim(),
      });
      if (onNameChange) onNameChange(groupName.trim());
      setActiveView('main');
      Alert.alert('Thành công', 'Đã đổi tên nhóm');
    } catch (error) {
      console.error('Error changing group name:', error);
      handleApiError(error, 'Không thể đổi tên nhóm');
    }
  };

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const res = await api.get(`/conversations/${conversationId}/members`);
      setMembers(res.data || []);
      setActiveView('members');
    } catch (error) {
      console.error('Error loading members:', error);
      Alert.alert('Lỗi', 'Không thể tải thành viên');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleDissolveGroup = () => {
    console.log('🔴 handleDissolveGroup called');
    showAlert(
      'Giải tán nhóm',
      'Bạn có chắc chắn muốn giải tán nhóm này? Hành động này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Giải tán',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/conversations/${conversationId}/dissolve`);
              showAlert('Thành công', 'Đã giải tán nhóm');
              onClose();
              if (onDissolve) {
                onDissolve();
              }
            } catch (error) {
              console.error('Error dissolving group:', error);
              handleApiError(error, 'Không thể giải tán nhóm');
            }
          },
        },
      ]
    );
  };

  const handleDeleteConversation = () => {
    console.log('🔴 handleDeleteConversation called', { isGroup });
    showAlert(
      isGroup ? 'Rời nhóm' : 'Xóa cuộc trò chuyện',
      isGroup 
        ? 'Bạn có chắc chắn muốn rời khỏi nhóm này?'
        : 'Bạn có chắc chắn muốn xóa cuộc trò chuyện này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: isGroup ? 'Rời nhóm' : 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/conversations/${conversationId}`);
              showAlert('Thành công', isGroup ? 'Đã rời nhóm' : 'Đã xóa cuộc trò chuyện');
              onClose();
              // Navigation will be handled by parent component
            } catch (error) {
              console.error('Error deleting conversation:', error);
              handleApiError(error, 'Không thể xóa cuộc trò chuyện');
            }
          },
        },
      ]
    );
  };

  const handleViewCommonGroups = async () => {
    try {
      if (isGroup) {
        // Trong nhóm: xem nhóm chung giữa các thành viên trong nhóm với nhau
        // Lấy tất cả nhóm của các thành viên và tìm nhóm chung
        const allGroups = new Map();
        const participantGroupsMap = new Map(); // Map: groupId -> [participantIds]
        
        // Lấy tất cả nhóm của từng thành viên
        for (const participantId of participants) {
          try {
            const res = await api.get(`/conversations/${conversationId}/common-groups`, {
              params: { userId: participantId }
            });
            
            const groups = res.data || [];
            groups.forEach(group => {
              const groupId = group.id || group._id;
              if (!allGroups.has(groupId)) {
                allGroups.set(groupId, group);
                participantGroupsMap.set(groupId, []);
              }
              participantGroupsMap.get(groupId).push(participantId);
            });
          } catch (error) {
            console.error(`Error loading groups for ${participantId}:`, error);
          }
        }
        
        // Tìm nhóm chung (nhóm có ít nhất 2 thành viên trong nhóm này tham gia)
        const commonGroups = [];
        for (const [groupId, group] of allGroups.entries()) {
          const participantIds = participantGroupsMap.get(groupId) || [];
          // Nhóm chung là nhóm có ít nhất 2 thành viên trong nhóm này cùng tham gia
          if (participantIds.length >= 2) {
            commonGroups.push(group);
          }
        }
        
        if (commonGroups.length === 0) {
          Alert.alert('Nhóm chung', 'Không có nhóm chung nào giữa các thành viên');
        } else {
          Alert.alert(
            'Nhóm chung',
            `Có ${commonGroups.length} nhóm chung giữa các thành viên:\n\n${commonGroups.map(g => `• ${g.name || 'Nhóm'}`).join('\n')}`,
            [{ text: 'OK' }]
          );
        }
      } else {
        // Chat riêng: xem nhóm chung của user đó với bạn
        const otherParticipant = participants.find(p => p !== currentUserId);
        if (!otherParticipant) {
          Alert.alert('Lỗi', 'Không tìm thấy người dùng');
          return;
        }
        
        const targetUserId = typeof otherParticipant === 'object' 
          ? (otherParticipant._id || otherParticipant.id)
          : otherParticipant;

        // Lấy nhóm chung giữa bạn và user đó
        const res = await api.get(`/conversations/${conversationId}/common-groups`, {
          params: { userId: targetUserId }
        });
        
        const commonGroups = res.data || [];
        
        if (commonGroups.length === 0) {
          Alert.alert('Nhóm chung', 'Không có nhóm chung nào');
        } else {
          Alert.alert(
            'Nhóm chung',
            `${commonGroups.length} nhóm chung:\n\n${commonGroups.map(g => `• ${g.name || 'Nhóm'}`).join('\n')}`,
            [{ text: 'OK' }]
          );
        }
      }
      onClose();
    } catch (error) {
      console.error('Error loading common groups:', error);
      Alert.alert('Lỗi', 'Không thể tải nhóm chung');
    }
  };

  const renderMainView = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isGroup ? 'Tùy chọn nhóm' : 'Tùy chọn'}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Ảnh nền */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setActiveView('wallpaper')}
          >
            <View style={styles.menuItemIcon}>
              <Ionicons name="image-outline" size={24} color="#00B14F" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>Đổi ảnh nền</Text>
              <Text style={styles.menuItemSubtext}>Tùy chỉnh ảnh nền cuộc trò chuyện</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Nhóm options */}
        {isGroup && (
          <>
            <View style={styles.section}>
              {isOwnerCurrentUser && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => setActiveView('name')}
                >
                  <View style={styles.menuItemIcon}>
                    <Ionicons name="pencil-outline" size={24} color="#00B14F" />
                  </View>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemText}>Đổi tên nhóm</Text>
                    <Text style={styles.menuItemSubtext}>Thay đổi tên nhóm</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={loadMembers}
              >
                <View style={styles.menuItemIcon}>
                  <Ionicons name="people-outline" size={24} color="#00B14F" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemText}>Thành viên nhóm</Text>
                  <Text style={styles.menuItemSubtext}>{participants.length} thành viên</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            </View>

            {/* Danger actions */}
            <View style={styles.dangerSection}>
              {isOwnerCurrentUser && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleDissolveGroup}
                  activeOpacity={0.7}
                  {...(Platform.OS === 'web' && {
                    pointerEvents: 'auto',
                  })}
                >
                  <View style={[styles.menuItemIcon, styles.dangerIcon]}>
                    <Ionicons name="trash-outline" size={24} color="#ff4444" />
                  </View>
                  <View style={styles.menuItemContent}>
                    <Text style={[styles.menuItemText, styles.dangerText]}>Giải tán nhóm</Text>
                    <Text style={styles.menuItemSubtext}>Xóa nhóm vĩnh viễn</Text>
                  </View>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={(e) => {
                  console.log('🔴 Rời nhóm button pressed', e);
                  e?.stopPropagation?.();
                  handleDeleteConversation();
                }}
                activeOpacity={0.7}
                {...(Platform.OS === 'web' && {
                  pointerEvents: 'auto',
                  onClick: (e) => {
                    e.stopPropagation();
                    handleDeleteConversation();
                  },
                })}
              >
                <View style={[styles.menuItemIcon, styles.dangerIcon]}>
                  <Ionicons name="exit-outline" size={24} color="#ff4444" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuItemText, styles.dangerText]}>Rời nhóm</Text>
                  <Text style={styles.menuItemSubtext}>Rời khỏi nhóm này</Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Chat riêng - Xóa cuộc trò chuyện */}
        {!isGroup && (
          <View style={styles.dangerSection}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleDeleteConversation}
              activeOpacity={0.7}
              {...(Platform.OS === 'web' && {
                pointerEvents: 'auto',
              })}
            >
              <View style={[styles.menuItemIcon, styles.dangerIcon]}>
                <Ionicons name="trash-outline" size={24} color="#ff4444" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemText, styles.dangerText]}>Xóa cuộc trò chuyện</Text>
                <Text style={styles.menuItemSubtext}>Xóa cuộc trò chuyện này</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Chat riêng options - Nhóm chung */}
        {!isGroup && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleViewCommonGroups}
            >
              <View style={styles.menuItemIcon}>
                <Ionicons name="people-circle-outline" size={24} color="#00B14F" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Nhóm chung</Text>
                <Text style={styles.menuItemSubtext}>Xem nhóm chung với người này</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </>
  );

  const renderWallpaperView = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setActiveView('main')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đổi ảnh nền</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.wallpaperGrid}>
          <TouchableOpacity
            style={[styles.wallpaperCard, !wallpaper && styles.wallpaperCardActive]}
            onPress={handleRemoveWallpaper}
            disabled={uploadingWallpaper}
          >
            <View style={[styles.wallpaperPreview, styles.noWallpaper]}>
              <Ionicons name="close-circle" size={32} color="#999" />
            </View>
            <Text style={styles.wallpaperLabel}>Mặc định</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.wallpaperCard}
            onPress={handlePickImage}
            disabled={uploadingWallpaper}
          >
            {uploadingWallpaper ? (
              <View style={[styles.wallpaperPreview, styles.customWallpaper]}>
                <ActivityIndicator size="large" color="#00B14F" />
              </View>
            ) : (
              <View style={[styles.wallpaperPreview, styles.customWallpaper]}>
                <Ionicons name="add-circle" size={32} color="#00B14F" />
              </View>
            )}
            <Text style={styles.wallpaperLabel}>Chọn ảnh</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );

  const renderMembersView = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setActiveView('main')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thành viên nhóm</Text>
        {isOwnerCurrentUser && (
          <TouchableOpacity onPress={() => setActiveView('name')} style={styles.saveHeaderButton}>
            <Ionicons name="pencil" size={20} color="#00B14F" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {loadingMembers ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00B14F" />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        ) : (
          <View style={styles.membersList}>
            {members.map((member) => {
              const memberId = member.id || member._id;
              const isCurrentUser = String(memberId) === String(currentUserId);
              const isOwner = member.isOwner;
              const isAdmin = member.isAdmin && !member.isOwner;
              const isMember = !isOwner && !isAdmin;
              
              return (
                <View key={memberId} style={styles.memberItem}>
                  {member.avatar ? (
                    <Image
                      source={{
                        uri: member.avatar.startsWith('http') ? member.avatar : `${BASE_URL}${member.avatar}`
                      }}
                      style={styles.memberAvatar}
                    />
                  ) : (
                    <View style={[styles.memberAvatar, styles.memberAvatarPlaceholder]}>
                      <Text style={styles.memberAvatarText}>
                        {(member.fullName || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{member.fullName || 'User'}</Text>
                      {isOwner && (
                        <View style={styles.adminBadge}>
                          <Ionicons name="key" size={14} color="#FFD700" />
                          <Text style={styles.adminText}>Trưởng nhóm</Text>
                        </View>
                      )}
                      {!isOwner && isAdmin && (
                        <View style={styles.memberBadge}>
                          <Ionicons name="key" size={14} color="#C0C0C0" />
                          <Text style={styles.memberText}>Quản trị viên</Text>
                        </View>
                      )}
                    </View>
                    {member.username && (
                      <Text style={styles.memberUsername}>@{member.username}</Text>
                    )}
                  </View>
                  {isOwnerCurrentUser && !isCurrentUser && (
                    <View style={styles.memberActions}>
                      {isMember ? (
                        // Thành viên thường -> nút Nâng lên quản trị viên
                        <TouchableOpacity
                          style={styles.memberActionButton}
                          onPress={() => {
                            console.log('🟡 Promote member pressed', { conversationId, memberId });
                            showAlert(
                              'Nâng lên quản trị viên',
                              `Bạn có chắc chắn muốn nâng ${member.fullName || 'người này'} lên quản trị viên?`,
                              [
                                { text: 'Hủy', style: 'cancel' },
                                {
                                  text: 'Nâng cấp',
                                  style: 'destructive',
                                  onPress: async () => {
                                    try {
                                      console.log('🟡 Calling promote API');
                                      await api.put(`/conversations/${conversationId}/promote/${memberId}`);
                                      showAlert('Thành công', 'Đã nâng cấp thành quản trị viên');
                                      await loadMembers();
                                      if (onConversationUpdate) {
                                        const res = await api.get(`/conversations/${conversationId}`);
                                        onConversationUpdate(res.data);
                                      }
                                    } catch (error) {
                                      console.log('🛑 Promote error', error);
                                      handleApiError(error, 'Không thể nâng cấp');
                                    }
                                  },
                                },
                              ]
                            );
                          }}
                          {...(Platform.OS === 'web' && {
                            pointerEvents: 'auto',
                            onClick: (e) => {
                              e.stopPropagation();
                              console.log('🟡 Promote member clicked (web)', { conversationId, memberId });
                              showAlert(
                                'Nâng lên quản trị viên',
                                `Bạn có chắc chắn muốn nâng ${member.fullName || 'người này'} lên quản trị viên?`,
                                [
                                  { text: 'Hủy', style: 'cancel' },
                                  {
                                    text: 'Nâng cấp',
                                    style: 'destructive',
                                    onPress: async () => {
                                      try {
                                        console.log('🟡 Calling promote API (web)');
                                        await api.put(`/conversations/${conversationId}/promote/${memberId}`);
                                        showAlert('Thành công', 'Đã nâng cấp thành quản trị viên');
                                        await loadMembers();
                                        if (onConversationUpdate) {
                                          const res = await api.get(`/conversations/${conversationId}`);
                                          onConversationUpdate(res.data);
                                        }
                                      } catch (error) {
                                        console.log('🛑 Promote error (web)', error);
                                        handleApiError(error, 'Không thể nâng cấp');
                                      }
                                    },
                                  },
                                ]
                              );
                            },
                          })}
                        >
                          <Ionicons name="arrow-up-circle" size={20} color="#00B14F" />
                          <Text style={styles.memberActionText}>Nâng cấp</Text>
                        </TouchableOpacity>
                      ) : (
                        // Đang là quản trị viên -> nút Gỡ + Chuyển nhượng giống Zalo
                        <View style={styles.memberActionsColumn}>
                          <TouchableOpacity
                            style={[styles.memberActionButton, styles.memberActionButtonDanger]}
                            onPress={() => {
                              console.log('🟠 Demote admin pressed', { conversationId, memberId });
                              showAlert(
                                'Gỡ quyền quản trị viên',
                                `Bạn có chắc chắn muốn gỡ quyền quản trị viên của ${member.fullName || 'người này'}?`,
                                [
                                  { text: 'Hủy', style: 'cancel' },
                                  {
                                    text: 'Gỡ quyền',
                                    style: 'destructive',
                                    onPress: async () => {
                                      try {
                                        console.log('🟠 Calling demote API');
                                        await api.put(`/conversations/${conversationId}/demote/${memberId}`);
                                        showAlert('Thành công', 'Đã gỡ quyền quản trị viên');
                                        await loadMembers();
                                        if (onConversationUpdate) {
                                          const res = await api.get(`/conversations/${conversationId}`);
                                          onConversationUpdate(res.data);
                                        }
                                      } catch (error) {
                                        console.log('🛑 Demote error', error);
                                        handleApiError(error, 'Không thể gỡ quyền');
                                      }
                                    },
                                  },
                                ]
                              );
                            }}
                            {...(Platform.OS === 'web' && {
                              pointerEvents: 'auto',
                              onClick: (e) => {
                                e.stopPropagation();
                                console.log('🟠 Demote admin clicked (web)', { conversationId, memberId });
                                showAlert(
                                  'Gỡ quyền quản trị viên',
                                  `Bạn có chắc chắn muốn gỡ quyền quản trị viên của ${member.fullName || 'người này'}?`,
                                  [
                                    { text: 'Hủy', style: 'cancel' },
                                    {
                                      text: 'Gỡ quyền',
                                      style: 'destructive',
                                      onPress: async () => {
                                        try {
                                          console.log('🟠 Calling demote API (web)');
                                          await api.put(`/conversations/${conversationId}/demote/${memberId}`);
                                          showAlert('Thành công', 'Đã gỡ quyền quản trị viên');
                                          await loadMembers();
                                          if (onConversationUpdate) {
                                            const res = await api.get(`/conversations/${conversationId}`);
                                            onConversationUpdate(res.data);
                                          }
                                        } catch (error) {
                                          console.log('🛑 Demote error (web)', error);
                                          handleApiError(error, 'Không thể gỡ quyền');
                                        }
                                      },
                                    },
                                  ]
                                );
                              },
                            })}
                          >
                            <Ionicons name="remove-circle" size={20} color="#ff4444" />
                            <Text style={[styles.memberActionText, styles.memberActionTextDanger]}>
                              Gỡ quản trị
                            </Text>
                          </TouchableOpacity>

                          <View style={{ height: 6 }} />

                          <TouchableOpacity
                            style={styles.memberActionButton}
                            onPress={() => {
                              console.log('🟢 Transfer admin pressed', { conversationId, memberId });
                              showAlert(
                                'Chuyển nhượng quyền quản trị',
                                `Bạn có chắc chắn muốn chuyển nhượng quyền quản trị cho ${member.fullName || 'người này'}? Bạn vẫn có thể là quản trị viên (nếu không gỡ quyền).`,
                                [
                                  { text: 'Hủy', style: 'cancel' },
                                  {
                                    text: 'Chuyển nhượng',
                                    style: 'destructive',
                                    onPress: async () => {
                                      try {
                                        console.log('🟢 Calling transfer-admin API');
                                        await api.put(`/conversations/${conversationId}/transfer-admin/${memberId}`);
                                        showAlert('Thành công', 'Đã chuyển nhượng quyền quản trị');
                                        await loadMembers();
                                        if (onConversationUpdate) {
                                          const res = await api.get(`/conversations/${conversationId}`);
                                          onConversationUpdate(res.data);
                                        }
                                      } catch (error) {
                                        console.log('🛑 Transfer-admin error', error);
                                        handleApiError(error, 'Không thể chuyển nhượng');
                                      }
                                    },
                                  },
                                ]
                              );
                            }}
                            {...(Platform.OS === 'web' && {
                              pointerEvents: 'auto',
                              onClick: (e) => {
                                e.stopPropagation();
                                console.log('🟢 Transfer admin clicked (web)', { conversationId, memberId });
                                showAlert(
                                  'Chuyển nhượng quyền quản trị',
                                  `Bạn có chắc chắn muốn chuyển nhượng quyền quản trị cho ${member.fullName || 'người này'}? Bạn vẫn có thể là quản trị viên (nếu không gỡ quyền).`,
                                  [
                                    { text: 'Hủy', style: 'cancel' },
                                    {
                                      text: 'Chuyển nhượng',
                                      style: 'destructive',
                                      onPress: async () => {
                                        try {
                                          console.log('🟢 Calling transfer-admin API (web)');
                                          await api.put(`/conversations/${conversationId}/transfer-admin/${memberId}`);
                                          showAlert('Thành công', 'Đã chuyển nhượng quyền quản trị');
                                          await loadMembers();
                                          if (onConversationUpdate) {
                                            const res = await api.get(`/conversations/${conversationId}`);
                                            onConversationUpdate(res.data);
                                          }
                                        } catch (error) {
                                          console.log('🛑 Transfer-admin error (web)', error);
                                          handleApiError(error, 'Không thể chuyển nhượng');
                                        }
                                      },
                                    },
                                  ]
                                );
                              },
                            })}
                          >
                            <Ionicons name="swap-horizontal" size={20} color="#FF9500" />
                            <Text style={[styles.memberActionText, { color: '#FF9500' }]}>
                              Chuyển nhượng
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </>
  );

  const renderNameView = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setActiveView('main')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đổi tên nhóm</Text>
        <TouchableOpacity onPress={handleChangeGroupName} style={styles.saveHeaderButton}>
          <Text style={styles.saveHeaderText}>Lưu</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Tên nhóm</Text>
          <TextInput
            style={styles.nameInput}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Nhập tên nhóm"
            autoFocus
            maxLength={50}
          />
          <Text style={styles.inputHint}>{groupName.length}/50 ký tự</Text>
        </View>
      </View>
    </>
  );

  const renderView = () => {
    if (activeView === 'main') return renderMainView();
    if (activeView === 'wallpaper') return renderWallpaperView();
    if (activeView === 'members') return renderMembersView();
    if (activeView === 'name') return renderNameView();
    return renderMainView();
  };

  if (!visible) {
    return null;
  }

  if (!conversation) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.bottomSheet} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} />
          {renderView()}
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 9999,
    elevation: 9999,
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
    zIndex: 10000,
    elevation: 10000,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  backButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  saveHeaderButton: {
    padding: 4,
  },
  saveHeaderText: {
    fontSize: 16,
    color: '#00B14F',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      userSelect: 'none',
    }),
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  menuItemSubtext: {
    fontSize: 13,
    color: '#999',
  },
  wallpaperGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  wallpaperCard: {
    flex: 1,
    alignItems: 'center',
  },
  wallpaperCardActive: {
    opacity: 0.7,
  },
  wallpaperPreview: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
  },
  noWallpaper: {
    backgroundColor: '#E5E5E5',
    borderColor: '#ddd',
  },
  customWallpaper: {
    backgroundColor: '#f0f0f0',
    borderColor: '#00B14F',
    borderStyle: 'dashed',
  },
  wallpaperLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  membersList: {
    paddingVertical: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  memberAvatarPlaceholder: {
    backgroundColor: '#00B14F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginRight: 8,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  adminText: {
    fontSize: 11,
    color: '#FFD700',
    fontWeight: '600',
    marginLeft: 4,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  memberText: {
    fontSize: 11,
    color: '#C0C0C0',
    fontWeight: '600',
    marginLeft: 4,
  },
  memberActions: {
    marginLeft: 'auto',
    alignItems: 'center',
  },
  memberActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  memberActionsColumn: {
    alignItems: 'flex-end',
  },
  memberActionText: {
    fontSize: 12,
    color: '#00B14F',
    fontWeight: '600',
    marginLeft: 4,
  },
  memberActionButtonDanger: {
    backgroundColor: '#ffecec',
  },
  memberActionTextDanger: {
    color: '#ff4444',
  },
  memberUsername: {
    fontSize: 13,
    color: '#999',
  },
  inputContainer: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  dangerSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  dangerIcon: {
    backgroundColor: '#fff5f5',
  },
  dangerText: {
    color: '#ff4444',
  },
});

export default ChatMenu;
