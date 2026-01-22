class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.slowOperations = [];
    this.maxSlowOperations = 50;
  }

  start(label) {
    const startTime = performance.now();
    this.metrics.set(label, { startTime });
    return label;
  }

  end(label) {
    const metric = this.metrics.get(label);
    if (!metric) {
      console.warn(`Performance metric ${label} not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    if (duration > 500) {
      this.logSlowOperation(label, duration);
    }

    this.metrics.delete(label);
    return duration;
  }

  async measure(label, fn) {
    this.start(label);
    try {
      const result = await fn();
      const duration = this.end(label);
      return { result, duration };
    } catch (error) {
      this.end(label);
      throw error;
    }
  }

  logSlowOperation(label, duration) {
    this.slowOperations.push({
      label,
      duration,
      timestamp: new Date().toISOString()
    });

    if (this.slowOperations.length > this.maxSlowOperations) {
      this.slowOperations.shift();
    }

    if (__DEV__) {
      console.warn(`⚠️ Slow operation: ${label} took ${duration.toFixed(2)}ms`);
    }
  }

  getSlowOperations(limit = 10) {
    return this.slowOperations
      .slice(-limit)
      .sort((a, b) => b.duration - a.duration);
  }

  getStats() {
    return {
      activeMetrics: this.metrics.size,
      slowOperationsCount: this.slowOperations.length,
      recentSlowOperations: this.getSlowOperations(5)
    };
  }

  clear() {
    this.metrics.clear();
    this.slowOperations = [];
  }
}

const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;

