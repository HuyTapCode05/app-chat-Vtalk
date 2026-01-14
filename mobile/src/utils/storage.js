/**
 * Storage Utility
 * Cross-platform storage abstraction (AsyncStorage for native, localStorage for web)
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

// Web storage using localStorage
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

// Use AsyncStorage on native, localStorage on web
const storage = Platform.OS === 'web' ? webStorage : AsyncStorage;

export default storage;

