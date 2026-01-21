import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

const InputBar = ({ 
  inputMessage, 
  setInputMessage, 
  handleSend, 
  handlePickImage, 
  toggleEmojiPicker, 
  setShowVoiceRecorder, 
  socket, 
  conversation, 
  user, 
  uploading,
  showEmojiPicker
}) => {

  const onTyping = (text) => {
    setInputMessage(text);
    if (socket && conversation) {
      const conversationId = conversation._id || conversation.id;
      if (conversationId) {
        socket.emit('typing', {
          conversationId: conversationId,
          userId: user.id,
          isTyping: text.length > 0,
        });
      }
    }
  };

  return (
    <View style={styles.inputContainer}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={handlePickImage}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator size="small" color={COLORS.PRIMARY} />
        ) : (
          <Ionicons name="image-outline" size={24} color={COLORS.PRIMARY} />
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Nhập tin nhắn..."
        value={inputMessage}
        onChangeText={onTyping}
        multiline
        maxLength={500}
        placeholderTextColor="#999"
      />

      <TouchableOpacity
        style={styles.iconButton}
        onPress={toggleEmojiPicker}
      >
        <Ionicons
          name="happy-outline"
          size={24}
          color={showEmojiPicker ? COLORS.PRIMARY : '#666'}
        />
      </TouchableOpacity>

      {inputMessage.trim() ? (
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSend}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() => setShowVoiceRecorder(true)}
          style={[styles.micButton, uploading && styles.micButtonDisabled]}
          disabled={uploading}
        >
          <Ionicons 
            name="mic" 
            size={24} 
            color={uploading ? COLORS.TEXT_SECONDARY : COLORS.PRIMARY} 
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  iconButton: {
    padding: 8,
    marginRight: 4,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    marginRight: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  micButtonDisabled: {
    backgroundColor: COLORS.BACKGROUND,
  },
});

export default React.memo(InputBar);

