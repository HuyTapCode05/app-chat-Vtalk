/**
 * Request Queue System
 * Queue heavy operations để tránh overload khi nhiều người login cùng lúc
 */

class RequestQueue {
  constructor(maxConcurrent = 10) {
    this.queue = [];
    this.processing = 0;
    this.maxConcurrent = maxConcurrent;
  }

  async add(fn, priority = 0) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        fn,
        priority,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      // Sort by priority (higher first), then by timestamp
      this.queue.sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
      });
      
      this.process();
    });
  }

  async process() {
    if (this.processing >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.processing++;
    const item = this.queue.shift();

    try {
      const result = await item.fn();
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    } finally {
      this.processing--;
      // Process next item
      setImmediate(() => this.process());
    }
  }

  getStats() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      maxConcurrent: this.maxConcurrent
    };
  }
}

// Global queues for different operations
const loginQueue = new RequestQueue(20); // Allow 20 concurrent logins
const registerQueue = new RequestQueue(10); // Allow 10 concurrent registrations
const dbQueue = new RequestQueue(50); // Allow 50 concurrent DB operations

module.exports = {
  RequestQueue,
  loginQueue,
  registerQueue,
  dbQueue
};

