import CryptoJS from 'crypto-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_STORAGE = '@vtalk:encryption_keys';

class EncryptionManager {
  constructor() {
    this.keys = {};
  }

  generateKey(userId1, userId2) {
    const sortedIds = [userId1, userId2].sort().join('_');
    const key = CryptoJS.SHA256(sortedIds + '_vtalk_secret').toString();
    return key;
  }

  async getKey(conversationId, otherUserId, currentUserId) {
    const keyId = `${conversationId}_${otherUserId}`;
    
    if (this.keys[keyId]) {
      return this.keys[keyId];
    }

    const key = this.generateKey(currentUserId, otherUserId);
    this.keys[keyId] = key;
    await this.saveKeys();
    
    return key;
  }

  async encryptMessage(message, conversationId, otherUserId, currentUserId) {
    try {
      const key = await this.getKey(conversationId, otherUserId, currentUserId);
      const encrypted = CryptoJS.AES.encrypt(message, key).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      return message;
    }
  }

  async decryptMessage(encryptedMessage, conversationId, otherUserId, currentUserId) {
    try {
      const key = await this.getKey(conversationId, otherUserId, currentUserId);
      const decrypted = CryptoJS.AES.decrypt(encryptedMessage, key);
      const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!plaintext) {
        return encryptedMessage;
      }
      
      return plaintext;
    } catch (error) {
      console.error('Decryption error:', error);
      return encryptedMessage;
    }
  }

  async saveKeys() {
    try {
      await AsyncStorage.setItem(KEY_STORAGE, JSON.stringify(this.keys));
    } catch (error) {
      console.error('Error saving encryption keys:', error);
    }
  }

  async loadKeys() {
    try {
      const stored = await AsyncStorage.getItem(KEY_STORAGE);
      if (stored) {
        this.keys = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading encryption keys:', error);
    }
  }

  async clearKeys() {
    this.keys = {};
    await AsyncStorage.removeItem(KEY_STORAGE);
  }
}

const encryptionManager = new EncryptionManager();
export default encryptionManager;

