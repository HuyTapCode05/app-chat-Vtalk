import AsyncStorage from '@react-native-async-storage/async-storage';

const ERROR_LOG_KEY = '@vtalk:error_log';
const MAX_ERROR_LOG_SIZE = 100;

class ErrorRecovery {
  constructor() {
    this.errorHandlers = new Map();
    this.recoveryStrategies = new Map();
  }

  registerHandler(errorType, handler) {
    this.errorHandlers.set(errorType, handler);
  }

  registerRecovery(errorType, strategy) {
    this.recoveryStrategies.set(errorType, strategy);
  }

  async handleError(error, context = {}) {
    const errorType = this.getErrorType(error);
    const handler = this.errorHandlers.get(errorType);
    
    await this.logError(error, context);

    const recovery = this.recoveryStrategies.get(errorType);
    if (recovery) {
      try {
        const recovered = await recovery(error, context);
        if (recovered) {
          console.log('✅ Error recovered:', errorType);
          return { recovered: true, error };
        }
      } catch (recoveryError) {
        console.error('Recovery failed:', recoveryError);
      }
    }

    if (handler) {
      return handler(error, context);
    }

    return { recovered: false, error };
  }

  getErrorType(error) {
    if (error.code === 'NETWORK_ERROR') return 'network';
    if (error.code === 'TIMEOUT') return 'timeout';
    if (error.message?.includes('database')) return 'database';
    if (error.response?.status === 401) return 'unauthorized';
    if (error.response?.status >= 500) return 'server';
    return 'unknown';
  }

  async logError(error, context) {
    try {
      const logs = await this.getErrorLogs();
      logs.push({
        error: {
          message: error.message,
          code: error.code,
          stack: error.stack
        },
        context,
        timestamp: new Date().toISOString()
      });

      if (logs.length > MAX_ERROR_LOG_SIZE) {
        logs.shift();
      }

      await AsyncStorage.setItem(ERROR_LOG_KEY, JSON.stringify(logs));
    } catch (logError) {
      console.error('Error logging error:', logError);
    }
  }

  async getErrorLogs() {
    try {
      const logs = await AsyncStorage.getItem(ERROR_LOG_KEY);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      return [];
    }
  }

  async clearErrorLogs() {
    await AsyncStorage.removeItem(ERROR_LOG_KEY);
  }
}

const errorRecovery = new ErrorRecovery();

errorRecovery.registerRecovery('network', async (error, context) => {
  if (context.retryFn) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return await context.retryFn();
  }
  return false;
});

errorRecovery.registerRecovery('unauthorized', async (error, context) => {
  if (context.logoutFn) {
    await context.logoutFn();
    return true;
  }
  return false;
});

export default errorRecovery;

