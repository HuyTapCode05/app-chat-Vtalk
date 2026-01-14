import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * MessageMenu Component
 * Context menu for message actions (pin, recall, delete, view profile, block)
 */
const MessageMenu = memo(({ 
  visible, 
  onClose, 
  message, 
  isOwn, 
  onDelete, 
  onRecall, 
  onPin, 
  onUnpin, 
  isPinned, 
  position,
  onViewProfile,
  onBlockUser,
  currentUserId
}) => {
  if (!visible) return null;

  // Get sender info
  const sender = message?.sender;
  const senderId = sender?._id || sender?.id || sender;
  const canViewProfile = !isOwn && senderId && senderId !== currentUserId;
  const canBlock = !isOwn && senderId && senderId !== currentUserId;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.menu, position && { top: position.y, left: position.x }]}>
          {/* View Profile - chỉ hiển thị khi không phải tin nhắn của mình */}
          {canViewProfile && onViewProfile && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onViewProfile(senderId);
                onClose();
              }}
            >
              <Ionicons name="person-outline" size={20} color="#00B14F" />
              <Text style={styles.menuText}>Xem trang cá nhân</Text>
            </TouchableOpacity>
          )}

          {/* Block User - chỉ hiển thị khi không phải tin nhắn của mình */}
          {canBlock && onBlockUser && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onBlockUser(senderId, sender?.fullName || 'người này');
                onClose();
              }}
            >
              <Ionicons name="ban-outline" size={20} color="#ff3040" />
              <Text style={[styles.menuText, styles.dangerText]}>Chặn người dùng</Text>
            </TouchableOpacity>
          )}

          {/* Divider */}
          {(canViewProfile || canBlock) && (
            <View style={styles.divider} />
          )}

          {/* Pin/Unpin */}
          {!message?.isTemp && !message?._id?.startsWith('temp_') && !message?.recalled && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                if (isPinned && onUnpin) {
                  onUnpin();
                } else if (!isPinned && onPin) {
                  onPin();
                }
                onClose();
              }}
            >
              <Ionicons name={isPinned ? "pin" : "pin-outline"} size={20} color="#00B14F" />
              <Text style={styles.menuText}>{isPinned ? 'Bỏ ghim' : 'Ghim'}</Text>
            </TouchableOpacity>
          )}

          {/* Recall - chỉ hiển thị cho tin nhắn của mình */}
          {isOwn && !message?.isTemp && !message?._id?.startsWith('temp_') && !message?.recalled && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onRecall();
                onClose();
              }}
            >
              <Ionicons name="arrow-undo" size={20} color="#00B14F" />
              <Text style={styles.menuText}>Thu hồi</Text>
            </TouchableOpacity>
          )}

          {/* Delete */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onDelete();
              onClose();
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#ff3040" />
            <Text style={[styles.menuText, styles.deleteText]}>Xóa</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  menu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
  },
  menuText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  deleteText: {
    color: '#ff3040',
  },
  dangerText: {
    color: '#ff3040',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 4,
  },
});

MessageMenu.displayName = 'MessageMenu';

export default MessageMenu;

