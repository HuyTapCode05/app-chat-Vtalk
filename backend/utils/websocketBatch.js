const eventThrottle = require('./eventThrottle');

class WebSocketBatch {
  constructor() {
    this.batches = new Map();
    this.batchDelay = 50;
    this.maxBatchSize = 10;
  }

  batchEmit(io, room, event, data) {
    const batchKey = `${room}:${event}`;
    
    if (!this.batches.has(batchKey)) {
      this.batches.set(batchKey, {
        messages: [],
        timer: null
      });
    }

    const batch = this.batches.get(batchKey);
    batch.messages.push(data);

    if (batch.messages.length >= this.maxBatchSize) {
      this.flushBatch(io, batchKey, room, event);
    } else {
      if (batch.timer) {
        clearTimeout(batch.timer);
      }
      batch.timer = setTimeout(() => {
        this.flushBatch(io, batchKey, room, event);
      }, this.batchDelay);
    }
  }

  flushBatch(io, batchKey, room, event) {
    const batch = this.batches.get(batchKey);
    if (!batch || batch.messages.length === 0) {
      return;
    }

    const messages = [...batch.messages];
    batch.messages = [];
    
    if (batch.timer) {
      clearTimeout(batch.timer);
      batch.timer = null;
    }

    if (messages.length === 1) {
      io.to(room).emit(event, messages[0]);
    } else {
      io.to(room).emit(event, {
        batch: true,
        messages,
        count: messages.length
      });
    }

    if (batch.messages.length === 0) {
      this.batches.delete(batchKey);
    }
  }

  flushAll(io) {
    for (const [batchKey, batch] of this.batches.entries()) {
      const [room, event] = batchKey.split(':');
      this.flushBatch(io, batchKey, room, event);
    }
  }

  clear(batchKey) {
    const batch = this.batches.get(batchKey);
    if (batch && batch.timer) {
      clearTimeout(batch.timer);
    }
    this.batches.delete(batchKey);
  }
}

const websocketBatch = new WebSocketBatch();
module.exports = websocketBatch;

