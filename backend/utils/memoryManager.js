/**
 * Memory Manager
 * Quản lý memory và cleanup tasks để tránh memory leaks
 */

const messageStorage = require('../storage/dbStorage');

class MemoryManager {
  constructor() {
    this.cleanupInterval = null;
    this.started = false;
  }

  start() {
    if (this.started) return;
    this.started = true;

    // Cleanup message cache every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupMessageCache();
      this.logMemoryUsage();
    }, 5 * 60 * 1000); // 5 minutes

    console.log('✅ Memory manager started');
  }

  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.started = false;
    console.log('🛑 Memory manager stopped');
  }

  cleanupMessageCache() {
    try {
      // Access message cache directly from dbStorage
      const dbStorage = require('../storage/dbStorage');
      const messageCache = dbStorage.messageCache || new Map();
      
      // Clear old cache entries (older than 5 minutes)
      const now = Date.now();
      let cleared = 0;
      
      for (const [key, value] of messageCache.entries()) {
        if (now - value.timestamp > 5 * 60 * 1000) {
          messageCache.delete(key);
          cleared++;
        }
      }
      
      if (cleared > 0) {
        console.log(`🧹 Cleaned up ${cleared} old message cache entries`);
      }
    } catch (error) {
      console.error('Error cleaning message cache:', error);
    }
  }

  logMemoryUsage() {
    if (process.env.NODE_ENV === 'development') {
      const used = process.memoryUsage();
      console.log('💾 Memory usage:', {
        rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(used.external / 1024 / 1024)}MB`
      });
    }
  }

  // Force garbage collection if available (requires --expose-gc flag)
  forceGC() {
    if (global.gc) {
      global.gc();
      console.log('🗑️ Forced garbage collection');
    }
  }

  getStats() {
    const used = process.memoryUsage();
    const dbStorage = require('../storage/dbStorage');
    const messageCache = dbStorage.messageCache || new Map();
    
    return {
      rss: Math.round(used.rss / 1024 / 1024),
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      external: Math.round(used.external / 1024 / 1024),
      messageCacheSize: messageCache.size || 0
    };
  }
}

const memoryManager = new MemoryManager();

module.exports = memoryManager;

