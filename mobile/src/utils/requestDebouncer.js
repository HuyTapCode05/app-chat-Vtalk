class RequestDebouncer {
  constructor() {
    this.timers = new Map();
    this.defaultDelay = 300;
  }

  debounce(key, fn, delay = this.defaultDelay) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    const timer = setTimeout(() => {
      fn();
      this.timers.delete(key);
    }, delay);

    this.timers.set(key, timer);
  }

  cancel(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  clear() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}

const requestDebouncer = new RequestDebouncer();
export default requestDebouncer;

