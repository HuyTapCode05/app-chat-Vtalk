import React, { useState, memo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../config/api';
import { handleApiError, showAlert } from '../utils/errorHandler';
import { getUserId } from '../utils/helpers';

/**
 * ContactMenu Component
 * Menu for contact actions (set nickname, unfriend, block, close friend)
 */
const ContactMenu = memo(({ visible, onClose, user, onUnfriend, onBlock, onSetNickname, currentUserId, onDeleteConversation, conversationId }) => {
  const [showNicknameInput, setShowNicknameInput] = useState(false);
  const [nickname, setNickname] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [loadingBlockStatus, setLoadingBlockStatus] = useState(false);

  const userId = user?._id || user?.id;

  // Check block status when menu opens
  useEffect(() => {
    if (visible && userId && currentUserId && userId !== currentUserId) {
      const checkBlockStatus = async () => {
        setLoadingBlockStatus(true);
        try {
          const res = await api.get(`/blocks/check/${userId}`);
          setIsBlocked(res.data?.blockedByMe || false);
        } catch (error) {
          console.error('Error checking block status:', error);
          setIsBlocked(false);
        } finally {
          setLoadingBlockStatus(false);
        }
      };
      checkBlockStatus();
    }
  }, [visible, userId, currentUserId]);

  if (!visible) return null;
  if (!user) {
    console.log('❌ ContactMenu: no user provided');
    return null;
  }

  console.log('📋 ContactMenu render:', {
    visible,
    userId,
    currentUserId,
    isSameUser: userId && currentUserId && String(userId) === String(currentUserId),
  });

  const handleUnfriend = () => {
    showAlert(
      'Hủy kết bạn',
      `Bạn có chắc chắn muốn hủy kết bạn với ${user.fullName || 'người này'}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/friends/${userId}`);
              if (onUnfriend) onUnfriend(userId);
              onClose();
              showAlert('Thành công', 'Đã hủy kết bạn');
            } catch (error) {
              console.error('Error unfriending:', error);
              handleApiError(error, 'Không thể hủy kết bạn');
            }
          },
        },
      ]
    );
  };

  const handleBlock = () => {
    if (isBlocked) {
      // Unblock
      showAlert(
        'Bỏ chặn người dùng',
        `Bạn có chắc chắn muốn bỏ chặn ${user.fullName || 'người này'}?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Bỏ chặn',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('🔴 Unblocking user:', { blockedId: userId });
                await api.delete(`/blocks/${userId}`);
                setIsBlocked(false);
                if (onBlock) onBlock(userId);
                onClose();
                showAlert('Thành công', 'Đã bỏ chặn người dùng');
              } catch (error) {
                console.error('Error unblocking:', error);
                handleApiError(error, 'Không thể bỏ chặn người dùng');
              }
            },
          },
        ]
      );
    } else {
      // Block
      console.log('🔴 handleBlock called', { userId, currentUserId });
      showAlert(
        'Chặn người dùng',
        `Bạn có chắc chắn muốn chặn ${user.fullName || 'người này'}? Bạn sẽ không nhận được tin nhắn từ họ.`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Chặn',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('🔴 Blocking user:', { blockedId: userId });
                const response = await api.post('/blocks', { blockedId: userId });
                console.log('🔴 Block response:', response.data);
                setIsBlocked(true);
                if (onBlock) onBlock(userId);
                onClose();
                showAlert('Thành công', 'Đã chặn người dùng');
              } catch (error) {
                console.error('Error blocking:', error);
                console.error('Error response:', error.response?.data);
                const errorMessage = error.response?.data?.message || error.message || 'Không thể chặn người dùng';
                console.error('Error message:', errorMessage);
                // If already blocked, update state
                if (errorMessage.includes('Đã chặn')) {
                  setIsBlocked(true);
                }
                handleApiError(error, errorMessage);
              }
            },
          },
        ]
      );
    }
  };

  const handleSetNickname = async () => {
    if (!nickname.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập biệt danh');
      return;
    }

    try {
      await api.post('/nicknames', {
        targetUserId: userId,
        nickname: nickname.trim(),
      });
      if (onSetNickname) onSetNickname(userId, nickname.trim());
      setShowNicknameInput(false);
      setNickname('');
      onClose();
      showAlert('Thành công', 'Đã đặt biệt danh');
    } catch (error) {
      console.error('Error setting nickname:', error);
      handleApiError(error, 'Không thể đặt biệt danh');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={styles.menuContainer}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
        >
          {!showNicknameInput ? (
            <>
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>{user.fullName || 'User'}</Text>
              </View>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowNicknameInput(true)}
                {...(Platform.OS === 'web' && {
                  onClick: (e) => {
                    e.stopPropagation();
                    setShowNicknameInput(true);
                  },
                  pointerEvents: 'auto',
                })}
              >
                <Ionicons name="pencil" size={22} color="#333" />
                <Text style={styles.menuItemText}>Đặt biệt danh</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={async () => {
                  try {
                    const userId = user._id || user.id;
                    const res = await api.get('/close-friends');
                    const isCloseFriend = (res.data || []).some(cf => {
                      const cfId = cf._id || cf.id;
                      return cfId && String(cfId) === String(userId);
                    });
                    
                    if (isCloseFriend) {
                      await api.delete(`/close-friends/${userId}`);
                      showAlert('Thành công', 'Đã bỏ đánh dấu bạn thân');
                    } else {
                      await api.post('/close-friends', { friendId: userId });
                      showAlert('Thành công', 'Đã đánh dấu bạn thân');
                    }
                    onClose();
                  } catch (error) {
                    console.error('Error toggling close friend:', error);
                    const errorMessage = error.response?.data?.message || 'Không thể thực hiện';
                    handleApiError(error, errorMessage);
                  }
                }}
                {...(Platform.OS === 'web' && {
                  onClick: async (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    try {
                      const userId = user._id || user.id;
                      const res = await api.get('/close-friends');
                      const isCloseFriend = (res.data || []).some(cf => {
                        const cfId = cf._id || cf.id;
                        return cfId && String(cfId) === String(userId);
                      });
                      
                      if (isCloseFriend) {
                        await api.delete(`/close-friends/${userId}`);
                        showAlert('Thành công', 'Đã bỏ đánh dấu bạn thân');
                      } else {
                        await api.post('/close-friends', { friendId: userId });
                        showAlert('Thành công', 'Đã đánh dấu bạn thân');
                      }
                      onClose();
                    } catch (error) {
                      console.error('Error toggling close friend:', error);
                      const errorMessage = error.response?.data?.message || 'Không thể thực hiện';
                      handleApiError(error, errorMessage);
                    }
                  },
                  pointerEvents: 'auto',
                })}
              >
                <Ionicons name="star" size={22} color="#FFD700" />
                <Text style={styles.menuItemText}>Đánh dấu bạn thân</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleUnfriend}
                {...(Platform.OS === 'web' && {
                  onClick: (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleUnfriend();
                  },
                  pointerEvents: 'auto',
                })}
              >
                <Ionicons name="person-remove" size={22} color="#ff4444" />
                <Text style={[styles.menuItemText, styles.dangerText]}>Hủy kết bạn</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleBlock}
                disabled={loadingBlockStatus}
                {...(Platform.OS === 'web' && {
                  onClick: (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (!loadingBlockStatus) {
                      handleBlock();
                    }
                  },
                  pointerEvents: loadingBlockStatus ? 'none' : 'auto',
                })}
              >
                <Ionicons name="ban" size={22} color="#ff4444" />
                <Text style={[styles.menuItemText, styles.dangerText]}>
                  {loadingBlockStatus ? 'Đang kiểm tra...' : (isBlocked ? 'Bỏ chặn người dùng' : 'Chặn người dùng')}
                </Text>
              </TouchableOpacity>

              <View style={styles.dangerSection}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    showAlert(
                      'Xóa cuộc trò chuyện',
                      'Bạn có chắc chắn muốn xóa cuộc trò chuyện này?',
                      [
                        { text: 'Hủy', style: 'cancel' },
                        {
                          text: 'Xóa',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              if (!conversationId) {
                                showAlert('Lỗi', 'Không tìm thấy conversation ID');
                                return;
                              }
                              console.log('🗑️ Deleting conversation:', conversationId);
                              await api.delete(`/conversations/${conversationId}`);
                              console.log('✅ Conversation deleted successfully');
                              onClose();
                              // Call callback after API success
                              if (onDeleteConversation) {
                                onDeleteConversation();
                              }
                            } catch (error) {
                              console.error('Error deleting conversation:', error);
                              handleApiError(error, 'Không thể xóa cuộc trò chuyện');
                            }
                          },
                        },
                      ]
                    );
                  }}
                  {...(Platform.OS === 'web' && {
                    onClick: (e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      showAlert(
                        'Xóa cuộc trò chuyện',
                        'Bạn có chắc chắn muốn xóa cuộc trò chuyện này?',
                        [
                          { text: 'Hủy', style: 'cancel' },
                          {
                            text: 'Xóa',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                if (!conversationId) {
                                  showAlert('Lỗi', 'Không tìm thấy conversation ID');
                                  return;
                                }
                                console.log('🗑️ Deleting conversation:', conversationId);
                                await api.delete(`/conversations/${conversationId}`);
                                console.log('✅ Conversation deleted successfully');
                                if (onDeleteConversation) {
                                  onDeleteConversation();
                                }
                                onClose();
                                showAlert('Thành công', 'Đã xóa cuộc trò chuyện');
                              } catch (error) {
                                console.error('Error deleting conversation:', error);
                                handleApiError(error, 'Không thể xóa cuộc trò chuyện');
                              }
                            },
                          },
                        ]
                      );
                    },
                    pointerEvents: 'auto',
                  })}
                >
                  <Ionicons name="trash-outline" size={22} color="#ff4444" />
                  <Text style={[styles.menuItemText, styles.dangerText]}>Xóa cuộc trò chuyện</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.menuItem, styles.cancelItem]}
                onPress={onClose}
                {...(Platform.OS === 'web' && {
                  onClick: (e) => {
                    e.stopPropagation();
                    onClose();
                  },
                  pointerEvents: 'auto',
                })}
              >
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.nicknameContainer}>
              <Text style={styles.nicknameLabel}>Nhập biệt danh:</Text>
              <TextInput
                style={styles.nicknameInput}
                value={nickname}
                onChangeText={setNickname}
                placeholder="Biệt danh"
                autoFocus
              />
              <View style={styles.nicknameButtons}>
                <TouchableOpacity
                  style={[styles.nicknameButton, styles.cancelButton]}
                  onPress={() => {
                    setShowNicknameInput(false);
                    setNickname('');
                  }}
                  {...(Platform.OS === 'web' && {
                    onClick: (e) => {
                      e.stopPropagation();
                      setShowNicknameInput(false);
                      setNickname('');
                    },
                    pointerEvents: 'auto',
                  })}
                >
                  <Text style={styles.cancelText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.nicknameButton, styles.saveButton]}
                  onPress={handleSetNickname}
                  {...(Platform.OS === 'web' && {
                    onClick: (e) => {
                      e.stopPropagation();
                      handleSetNickname();
                    },
                    pointerEvents: 'auto',
                  })}
                >
                  <Text style={styles.saveText}>Lưu</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '80%',
    maxWidth: 400,
    padding: 16,
  },
  menuHeader: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 8,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  dangerText: {
    color: '#ff4444',
  },
  cancelItem: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  nicknameContainer: {
    padding: 8,
  },
  nicknameLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  nicknameInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  nicknameButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nicknameButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#00B14F',
  },
  saveText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ContactMenu;

