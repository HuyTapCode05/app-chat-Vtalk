import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VoiceMessage from '../VoiceMessage';
import { BASE_URL } from '../../config/api';

const MessageItem = ({ item, user, nicknames, messageReactions, onLongPress, onAddReaction }) => {
  const senderId = item.sender?._id || item.sender?.id || item.sender;
  const isOwn = senderId === user.id;
  const isImage = item.type === 'image';
  const isVoice = item.type === 'voice';
  const isRecalled = item.recalled;

  return (
    <TouchableOpacity
      style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}
      onLongPress={(e) => onLongPress(item, e)}
      activeOpacity={0.7}
    >
      {!isOwn && (
        <View style={styles.avatar}>
          {item.sender?.avatar ? (
            <Image
              source={{ uri: item.sender.avatar.startsWith('http') ? item.sender.avatar : `${BASE_URL}${item.sender.avatar}` }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarText}>
              {item.sender?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          )}
        </View>
      )}
      <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
        {!isOwn && (
          <Text style={styles.senderName}>
            {(() => {
              const senderIdStr = String(senderId || '');
              return nicknames[senderIdStr] || item.sender?.fullName || 'User';
            })()}
          </Text>
        )}
        {isRecalled ? (
          <Text style={[styles.messageText, styles.recalledText]}>
            Tin nhắn đã được thu hồi
          </Text>
        ) : isImage ? (
          <Image
            source={{ uri: `${BASE_URL}${item.content}` }}
            style={styles.messageImage}
            resizeMode="cover"
          />
        ) : isVoice ? (
          <VoiceMessage
            voiceUrl={item.content}
            duration={item.duration || 0}
            isOwn={isOwn}
            baseUrl={BASE_URL}
          />
        ) : (
          <Text style={[styles.messageText, isOwn ? styles.ownMessageText : styles.otherMessageText]}>
            {item.content}
          </Text>
        )}
        <View style={styles.messageFooter}>
          <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
            {new Date(item.createdAt).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        {messageReactions && Object.keys(messageReactions).length > 0 && (
          <View style={styles.reactionsContainer}>
            {Object.entries(messageReactions).map(([reaction, userIds]) => (
              <TouchableOpacity
                key={reaction}
                style={[
                  styles.reactionBadge,
                  userIds.includes(user?.id || user?._id) && styles.reactionBadgeActive,
                ]}
                onPress={() => onAddReaction(item._id || item.id, reaction)}
              >
                <Text style={styles.reactionEmoji}>{reaction}</Text>
                {userIds.length > 0 && <Text style={styles.reactionCount}>{userIds.length}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00B14F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
  },
  ownBubble: {
    backgroundColor: '#00B14F',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#333',
  },
  recalledText: {
    fontStyle: 'italic',
    color: '#999',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 10,
    opacity: 0.7,
  },
  ownMessageTime: {
    color: '#fff',
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  reactionBadgeActive: {
    backgroundColor: '#e3f2fd',
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
});

export default React.memo(MessageItem);

