const { dbQueue } = require('./requestQueue');

class JobQueue {
  constructor() {
    this.jobs = new Map();
    this.processing = false;
  }

  async add(jobId, fn, priority = 0) {
    this.jobs.set(jobId, {
      fn,
      priority,
      status: 'pending',
      createdAt: Date.now()
    });

    this.process();
  }

  async process() {
    if (this.processing || this.jobs.size === 0) {
      return;
    }

    this.processing = true;

    const sortedJobs = Array.from(this.jobs.entries())
      .filter(([_, job]) => job.status === 'pending')
      .sort((a, b) => b[1].priority - a[1].priority);

    for (const [jobId, job] of sortedJobs) {
      try {
        job.status = 'processing';
        await dbQueue.add(async () => {
          await job.fn();
          this.jobs.delete(jobId);
        });
      } catch (error) {
        console.error(`Error processing job ${jobId}:`, error);
        job.status = 'failed';
        job.error = error.message;
      }
    }

    this.processing = false;
  }

  getStatus(jobId) {
    const job = this.jobs.get(jobId);
    return job ? job.status : 'not_found';
  }

  cancel(jobId) {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'pending') {
      this.jobs.delete(jobId);
      return true;
    }
    return false;
  }

  getStats() {
    const stats = {
      total: this.jobs.size,
      pending: 0,
      processing: 0,
      failed: 0
    };

    for (const job of this.jobs.values()) {
      stats[job.status] = (stats[job.status] || 0) + 1;
    }

    return stats;
  }
}

const jobQueue = new JobQueue();
module.exports = jobQueue;

