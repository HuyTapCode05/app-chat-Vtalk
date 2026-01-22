import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@vtalk:offline_queue';
const SYNC_KEY = '@vtalk:last_sync';

class OfflineQueue {
  constructor() {
    this.queue = [];
    this.isOnline = true;
    this.syncListeners = [];
  }

  async init() {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`📦 Loaded ${this.queue.length} queued messages`);
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
    }
  }

  async addMessage(message) {
    const queuedMessage = {
      ...message,
      queuedAt: new Date().toISOString(),
      id: `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.queue.push(queuedMessage);
    await this.saveQueue();
    
    console.log('📝 Message queued:', queuedMessage.id);
    return queuedMessage;
  }

  getQueue() {
    return [...this.queue];
  }

  async clearQueue() {
    this.queue = [];
    await this.saveQueue();
  }

  async removeMessage(messageId) {
    this.queue = this.queue.filter(msg => msg.id !== messageId);
    await this.saveQueue();
  }

  async saveQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

  setOnline(isOnline) {
    const wasOffline = !this.isOnline && isOnline;
    this.isOnline = isOnline;

    if (wasOffline) {
      console.log('🌐 Back online, triggering sync...');
      this.triggerSync();
    }
  }

  triggerSync() {
    this.syncListeners.forEach(listener => {
      try {
        listener(this.queue);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  onSync(callback) {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
    };
  }

  async getLastSync() {
    try {
      const timestamp = await AsyncStorage.getItem(SYNC_KEY);
      return timestamp ? new Date(timestamp) : null;
    } catch (error) {
      console.error('Error getting last sync:', error);
      return null;
    }
  }

  async updateLastSync() {
    try {
      await AsyncStorage.setItem(SYNC_KEY, new Date().toISOString());
    } catch (error) {
      console.error('Error updating last sync:', error);
    }
  }
}

const offlineQueue = new OfflineQueue();
export default offlineQueue;

