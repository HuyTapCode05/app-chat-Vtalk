class EventThrottle {
  constructor() {
    this.eventQueues = new Map();
    this.defaultThrottleMs = 100;
  }

  throttle(eventKey, fn, throttleMs = this.defaultThrottleMs) {
    if (!this.eventQueues.has(eventKey)) {
      this.eventQueues.set(eventKey, {
        lastEmit: 0,
        queue: [],
        throttleMs
      });
    }

    const eventData = this.eventQueues.get(eventKey);
    const now = Date.now();
    const timeSinceLastEmit = now - eventData.lastEmit;

    if (timeSinceLastEmit >= throttleMs) {
      eventData.lastEmit = now;
      fn();
    } else {
      eventData.queue.push(fn);
      const delay = throttleMs - timeSinceLastEmit;
      setTimeout(() => {
        this.processQueue(eventKey);
      }, delay);
    }
  }

  processQueue(eventKey) {
    const eventData = this.eventQueues.get(eventKey);
    if (!eventData || eventData.queue.length === 0) {
      return;
    }

    const latestFn = eventData.queue[eventData.queue.length - 1];
    eventData.queue = [];
    eventData.lastEmit = Date.now();

    latestFn();
  }

  debounce(eventKey, fn, debounceMs = 300) {
    if (!this.eventQueues.has(eventKey)) {
      this.eventQueues.set(eventKey, {
        timer: null,
        debounceMs
      });
    }

    const eventData = this.eventQueues.get(eventKey);
    
    if (eventData.timer) {
      clearTimeout(eventData.timer);
    }

    eventData.timer = setTimeout(() => {
      fn();
      eventData.timer = null;
    }, debounceMs);
  }

  clear(eventKey) {
    const eventData = this.eventQueues.get(eventKey);
    if (eventData && eventData.timer) {
      clearTimeout(eventData.timer);
    }
    this.eventQueues.delete(eventKey);
  }

  clearAll() {
    for (const [key, eventData] of this.eventQueues.entries()) {
      if (eventData.timer) {
        clearTimeout(eventData.timer);
      }
    }
    this.eventQueues.clear();
  }
}

const eventThrottle = new EventThrottle();
module.exports = eventThrottle;

