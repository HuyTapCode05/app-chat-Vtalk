const jobQueue = require('./jobQueue');

class BackgroundTasks {
  constructor() {
    this.tasks = new Map();
    this.intervals = new Map();
  }

  addTask(taskId, taskFn, intervalMs = null) {
    if (intervalMs) {
      const interval = setInterval(async () => {
        await jobQueue.add(taskId, taskFn, 0);
      }, intervalMs);
      this.intervals.set(taskId, interval);
    } else {
      jobQueue.add(taskId, taskFn, 0);
    }

    this.tasks.set(taskId, {
      fn: taskFn,
      interval: intervalMs,
      createdAt: Date.now()
    });
  }

  removeTask(taskId) {
    const interval = this.intervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(taskId);
    }
    this.tasks.delete(taskId);
  }

  startCleanupTasks() {
    this.addTask('cleanup_old_messages', async () => {
      const storage = require('../storage/dbStorage');
      console.log('🧹 Cleanup old messages task');
    }, 24 * 60 * 60 * 1000);

    this.addTask('cleanup_cache', async () => {
      const { userCache, conversationCache, messageCache, generalCache } = require('./advancedCache');
      userCache.cleanup();
      conversationCache.cleanup();
      messageCache.cleanup();
      generalCache.cleanup();
      console.log('🧹 Cleanup cache task');
    }, 5 * 60 * 1000);

    this.addTask('cleanup_sessions', async () => {
      const sessionManager = require('./sessionManager');
      console.log('🧹 Cleanup sessions task');
    }, 60 * 60 * 1000);
  }

  stopAll() {
    for (const [taskId, interval] of this.intervals.entries()) {
      clearInterval(interval);
    }
    this.intervals.clear();
    this.tasks.clear();
  }

  getStats() {
    return {
      totalTasks: this.tasks.size,
      recurringTasks: this.intervals.size,
      tasks: Array.from(this.tasks.keys())
    };
  }
}

const backgroundTasks = new BackgroundTasks();
module.exports = backgroundTasks;

