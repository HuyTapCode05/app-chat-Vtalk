class OptimisticUpdates {
  constructor() {
    this.pendingUpdates = new Map();
    this.updateListeners = new Map();
  }

  add(updateId, data, syncFn) {
    const update = {
      data,
      timestamp: Date.now(),
      status: 'pending',
      syncFn
    };

    this.pendingUpdates.set(updateId, update);

    this.notifyListeners(updateId, 'added', data);

    if (syncFn) {
      syncFn(data)
        .then(() => {
          update.status = 'synced';
          this.notifyListeners(updateId, 'synced', data);
        })
        .catch((error) => {
          update.status = 'failed';
          update.error = error;
          this.notifyListeners(updateId, 'failed', { data, error });
        });
    }

    return updateId;
  }

  remove(updateId) {
    this.pendingUpdates.delete(updateId);
    this.notifyListeners(updateId, 'removed', null);
  }

  get(updateId) {
    return this.pendingUpdates.get(updateId);
  }

  getAll() {
    return Array.from(this.pendingUpdates.values());
  }

  onUpdate(key, listener) {
    if (!this.updateListeners.has(key)) {
      this.updateListeners.set(key, []);
    }
    this.updateListeners.get(key).push(listener);

    return () => {
      const listeners = this.updateListeners.get(key);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  notifyListeners(updateId, event, data) {
    for (const listeners of this.updateListeners.values()) {
      listeners.forEach(listener => {
        try {
          listener(updateId, event, data);
        } catch (error) {
          console.error('Error in update listener:', error);
        }
      });
    }
  }

  clear() {
    this.pendingUpdates.clear();
    this.updateListeners.clear();
  }
}

const optimisticUpdates = new OptimisticUpdates();
export default optimisticUpdates;

