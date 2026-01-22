class RetryHandler {
  constructor() {
    this.defaultMaxRetries = 3;
    this.defaultInitialDelay = 1000;
    this.defaultMaxDelay = 10000;
  }

  async retry(fn, options = {}) {
    const {
      maxRetries = this.defaultMaxRetries,
      initialDelay = this.defaultInitialDelay,
      maxDelay = this.defaultMaxDelay,
      onRetry = null,
      shouldRetry = null
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (shouldRetry && !shouldRetry(error, attempt)) {
          throw error;
        }

        if (attempt === maxRetries) {
          break;
        }

        if (onRetry) {
          onRetry(error, attempt + 1, delay);
        }

        await this.sleep(delay);
        delay = Math.min(delay * 2, maxDelay);
      }
    }

    throw lastError;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async retryDatabase(fn, maxRetries = 3) {
    return this.retry(fn, {
      maxRetries,
      shouldRetry: (error) => {
        return error.message && (
          error.message.includes('database is locked') ||
          error.message.includes('SQLITE_BUSY')
        );
      }
    });
  }

  async retryNetwork(fn, maxRetries = 3) {
    return this.retry(fn, {
      maxRetries,
      shouldRetry: (error) => {
        return error.code === 'ECONNRESET' ||
               error.code === 'ETIMEDOUT' ||
               error.code === 'ENOTFOUND' ||
               (error.response && error.response.status >= 500);
      }
    });
  }
}

const retryHandler = new RetryHandler();
module.exports = retryHandler;

