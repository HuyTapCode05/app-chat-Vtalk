class AdvancedCache {
  constructor(maxSize = 1000, defaultTTL = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.accessOrder = new Map();
    this.cleanupInterval = null;
  }

  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.delete(key);
      return null;
    }

    this.accessOrder.set(key, Date.now());
    return cached.value;
  }

  set(key, value, ttl = this.defaultTTL) {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    });
    this.accessOrder.set(key, Date.now());
  }

  delete(key) {
    this.cache.delete(key);
    this.accessOrder.delete(key);
  }

  clear(pattern) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.delete(key);
        }
      }
    } else {
      this.cache.clear();
      this.accessOrder.clear();
    }
  }

  evictLRU() {
    if (this.accessOrder.size === 0) return;

    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.accessOrder.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.delete(key));

    if (expiredKeys.length > 0) {
      console.log(`🧹 Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  startCleanup(intervalMs = 60 * 1000) {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, intervalMs);
  }

  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  getStats() {
    const now = Date.now();
    let expired = 0;
    let totalSize = 0;

    for (const cached of this.cache.values()) {
      if (now > cached.expiresAt) {
        expired++;
      }
      totalSize += JSON.stringify(cached.value).length;
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      expired,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
    };
  }
}

const userCache = new AdvancedCache(500, 2 * 60 * 1000);
const conversationCache = new AdvancedCache(200, 1 * 60 * 1000);
const messageCache = new AdvancedCache(100, 30 * 1000);
const generalCache = new AdvancedCache(1000, 5 * 60 * 1000);

userCache.startCleanup();
conversationCache.startCleanup();
messageCache.startCleanup();
generalCache.startCleanup();

module.exports = {
  AdvancedCache,
  userCache,
  conversationCache,
  messageCache,
  generalCache
};

