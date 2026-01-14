/**
 * Environment Configuration
 * Centralized environment variables and configuration
 */

import { Platform } from 'react-native';

// Development mode detection
export const __DEV__ = process.env.NODE_ENV !== 'production';

// API Configuration
export const API_CONFIG = {
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// Socket Configuration
export const SOCKET_CONFIG = {
  RECONNECTION_DELAY: 1000,
  RECONNECTION_DELAY_MAX: 5000,
  RECONNECTION_ATTEMPTS: Infinity,
  TIMEOUT: 20000,
};

// Platform specific configs
export const PLATFORM_CONFIG = {
  isWeb: Platform.OS === 'web',
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
};

// Feature flags
export const FEATURES = {
  ENABLE_LOGGING: __DEV__,
  ENABLE_PERFORMANCE_MONITORING: __DEV__,
  ENABLE_ERROR_REPORTING: !__DEV__,
  ENABLE_ANALYTICS: !__DEV__,
};

// Cache configuration
export const CACHE_CONFIG = {
  MESSAGE_CACHE_SIZE: 100,
  USER_CACHE_SIZE: 50,
  CONVERSATION_CACHE_SIZE: 30,
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  MESSAGES_PER_PAGE: 50,
  CONVERSATIONS_PER_PAGE: 30,
};

// Image configuration
export const IMAGE_CONFIG = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  QUALITY: 0.8,
  MAX_WIDTH: 1920,
  MAX_HEIGHT: 1920,
};

// Performance thresholds
export const PERFORMANCE = {
  SLOW_NETWORK_THRESHOLD: 3000, // 3 seconds
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 1000,
};

