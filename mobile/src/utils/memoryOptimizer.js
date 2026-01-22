class MemoryOptimizer {
  constructor() {
    this.imageCache = new Map();
    this.maxImageCacheSize = 50;
    this.cleanupInterval = null;
  }

  startCleanup(intervalMs = 5 * 60 * 1000) {
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

  cleanup() {
    if (this.imageCache.size > this.maxImageCacheSize) {
      const entries = Array.from(this.imageCache.entries());
      const toRemove = entries.slice(0, entries.length - this.maxImageCacheSize);
      
      toRemove.forEach(([key]) => {
        this.imageCache.delete(key);
      });

      if (__DEV__) {
        console.log(`🧹 Cleaned up ${toRemove.length} image cache entries`);
      }
    }
  }

  trackImage(uri) {
    if (!this.imageCache.has(uri)) {
      this.imageCache.set(uri, {
        uri,
        lastUsed: Date.now(),
        useCount: 0
      });
    }

    const entry = this.imageCache.get(uri);
    entry.lastUsed = Date.now();
    entry.useCount++;
  }

  getStats() {
    return {
      imageCacheSize: this.imageCache.size,
      maxImageCacheSize: this.maxImageCacheSize
    };
  }

  clear() {
    this.imageCache.clear();
  }
}

const memoryOptimizer = new MemoryOptimizer();
memoryOptimizer.startCleanup();

export default memoryOptimizer;

