/**
 * Performance Utilities
 * Performance monitoring and optimization helpers
 */

import { logger } from './logger';
import { PERFORMANCE } from './env';

/**
 * Measure function execution time
 */
export const measurePerformance = (fn, label) => {
  return async (...args) => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const end = performance.now();
      const duration = end - start;
      
      if (duration > PERFORMANCE.SLOW_NETWORK_THRESHOLD) {
        logger.warn(`Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
      } else {
        logger.debug(`${label} completed in ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const end = performance.now();
      logger.error(`${label} failed after ${(end - start).toFixed(2)}ms:`, error);
      throw error;
    }
  };
};

/**
 * Batch operations to reduce re-renders
 */
export const batchUpdates = (updates) => {
  // React 18+ has automatic batching, but this helps with older versions
  return Promise.all(updates);
};

/**
 * Lazy load component
 */
export const lazyLoad = (importFn, fallback = null) => {
  return React.lazy(importFn);
};

/**
 * Check if operation should be throttled
 */
export const shouldThrottle = (lastExecution, delay = PERFORMANCE.THROTTLE_DELAY) => {
  return Date.now() - lastExecution < delay;
};

/**
 * Debounce function execution
 */
export const debounceFn = (fn, delay = PERFORMANCE.DEBOUNCE_DELAY) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Throttle function execution
 */
export const throttleFn = (fn, delay = PERFORMANCE.THROTTLE_DELAY) => {
  let lastExecution = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastExecution >= delay) {
      lastExecution = now;
      return fn(...args);
    }
  };
};

