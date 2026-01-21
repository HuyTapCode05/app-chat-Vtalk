/**
 * Storage Utility
 * Provides two storage options:
 * - `storage`: For non-sensitive data (uses AsyncStorage on native, localStorage on web).
 * - `secureStorage`: For sensitive data like tokens (uses Expo's SecureStore on native, localStorage on web).
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { logger } from './logger';

// Web storage using localStorage (for both secure and non-secure on web)
const webStorage = {
  async getItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    } catch (error) {
      logger.error('localStorage getItem error:', error);
      return null;
    }
  },
  async setItem(key, value) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (error) {
      logger.error('localStorage setItem error:', error);
    }
  },
  async removeItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      logger.error('localStorage removeItem error:', error);
    }
  },
};

// Secure storage for native platforms
const nativeSecureStorage = {
  async getItem(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      logger.error('SecureStore getItem error:', error);
      return null;
    }
  },
  async setItem(key, value) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      logger.error('SecureStore setItem error:', error);
    }
  },
  async removeItem(key) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      logger.error('SecureStore removeItem error:', error);
    }
  },
};

// Use AsyncStorage on native for non-sensitive data, localStorage on web
const storage = Platform.OS === 'web' ? webStorage : AsyncStorage;

// Use SecureStore on native for sensitive data, localStorage on web
const secureStorage = Platform.OS === 'web' ? webStorage : nativeSecureStorage;

export default storage;
export { secureStorage };
