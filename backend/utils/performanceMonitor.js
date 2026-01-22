class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.slowQueries = [];
    this.maxSlowQueries = 100;
  }

  start(label) {
    const startTime = process.hrtime.bigint();
    this.metrics.set(label, { startTime });
    return label;
  }

  end(label) {
    const metric = this.metrics.get(label);
    if (!metric) {
      console.warn(`Performance metric ${label} not found`);
      return null;
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - metric.startTime) / 1000000;
    const durationSeconds = duration / 1000;

    metric.endTime = endTime;
    metric.duration = duration;
    metric.durationSeconds = durationSeconds;

    if (duration > 1000) {
      this.logSlowQuery(label, duration);
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

  logSlowQuery(label, duration) {
    this.slowQueries.push({
      label,
      duration,
      timestamp: new Date().toISOString()
    });

    if (this.slowQueries.length > this.maxSlowQueries) {
      this.slowQueries.shift();
    }

    console.warn(`⚠️ Slow operation: ${label} took ${duration.toFixed(2)}ms`);
  }

  getSlowQueries(limit = 10) {
    return this.slowQueries
      .slice(-limit)
      .sort((a, b) => b.duration - a.duration);
  }

  getStats() {
    return {
      activeMetrics: this.metrics.size,
      slowQueriesCount: this.slowQueries.length,
      recentSlowQueries: this.getSlowQueries(5)
    };
  }

  clear() {
    this.metrics.clear();
    this.slowQueries = [];
  }
}

const performanceMonitor = new PerformanceMonitor();
module.exports = performanceMonitor;

