/**
 * Logger Utility
 * Centralized logging with levels and environment awareness
 */

import { FEATURES } from './env';

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

const CURRENT_LOG_LEVEL = __DEV__ ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR;

class Logger {
  debug(...args) {
    if (FEATURES.ENABLE_LOGGING && CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      console.log('🐛 [DEBUG]', ...args);
    }
  }

  info(...args) {
    if (FEATURES.ENABLE_LOGGING && CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
      console.log('ℹ️ [INFO]', ...args);
    }
  }

  warn(...args) {
    if (FEATURES.ENABLE_LOGGING && CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
      console.warn('⚠️ [WARN]', ...args);
    }
  }

  error(...args) {
    if (FEATURES.ENABLE_LOGGING && CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR) {
      console.error('❌ [ERROR]', ...args);
    }
  }

  success(...args) {
    if (FEATURES.ENABLE_LOGGING && CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
      console.log('✅ [SUCCESS]', ...args);
    }
  }

  // Performance logging
  time(label) {
    if (FEATURES.ENABLE_PERFORMANCE_MONITORING) {
      console.time(`⏱️ [PERF] ${label}`);
    }
  }

  timeEnd(label) {
    if (FEATURES.ENABLE_PERFORMANCE_MONITORING) {
      console.timeEnd(`⏱️ [PERF] ${label}`);
    }
  }

  // Network logging
  network(method, url, data = null) {
    if (FEATURES.ENABLE_LOGGING) {
      console.log(`🌐 [NETWORK] ${method} ${url}`, data || '');
    }
  }
}

export const logger = new Logger();
export default logger;

