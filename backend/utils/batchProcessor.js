class BatchProcessor {
  constructor(batchSize = 10, batchDelay = 50) {
    this.batches = new Map();
    this.batchSize = batchSize;
    this.batchDelay = batchDelay;
  }

  add(batchKey, item, processor) {
    if (!this.batches.has(batchKey)) {
      this.batches.set(batchKey, {
        items: [],
        timer: null,
        processor
      });
    }

    const batch = this.batches.get(batchKey);
    
    // Set processor if provided
    if (processor) {
      batch.processor = processor;
    }
    
    // Only add item if it's not null/undefined
    if (item !== null && item !== undefined) {
      batch.items.push(item);
    }

    if (batch.items.length >= this.batchSize) {
      this.processBatch(batchKey);
    } else {
      if (batch.timer) {
        clearTimeout(batch.timer);
      }
      batch.timer = setTimeout(() => {
        this.processBatch(batchKey);
      }, this.batchDelay);
    }
  }

  async processBatch(batchKey) {
    const batch = this.batches.get(batchKey);
    if (!batch || batch.items.length === 0) {
      return;
    }

    const items = [...batch.items];
    batch.items = [];
    
    if (batch.timer) {
      clearTimeout(batch.timer);
      batch.timer = null;
    }

    try {
      await batch.processor(items);
    } catch (error) {
      console.error(`Error processing batch ${batchKey}:`, error);
    }
  }

  async flush(batchKey) {
    await this.processBatch(batchKey);
  }

  async flushAll() {
    const promises = [];
    for (const batchKey of this.batches.keys()) {
      promises.push(this.processBatch(batchKey));
    }
    await Promise.all(promises);
  }

  clear(batchKey) {
    const batch = this.batches.get(batchKey);
    if (batch && batch.timer) {
      clearTimeout(batch.timer);
    }
    this.batches.delete(batchKey);
  }

  clearAll() {
    for (const [key, batch] of this.batches.entries()) {
      if (batch.timer) {
        clearTimeout(batch.timer);
      }
    }
    this.batches.clear();
  }

  getStats() {
    const stats = {};
    for (const [key, batch] of this.batches.entries()) {
      stats[key] = {
        pendingItems: batch.items.length,
        hasTimer: !!batch.timer
      };
    }
    return stats;
  }
}

const batchProcessor = new BatchProcessor();
module.exports = batchProcessor;

