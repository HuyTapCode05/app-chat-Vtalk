import axios from 'axios';
import storage from '../utils/storage';
import { Platform } from 'react-native';
import { API_TIMEOUT, STORAGE_KEYS } from '../utils/constants';
import { handleNetworkError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { API_CONFIG } from '../utils/env';


const YOUR_COMPUTER_IP = '192.168.1.5';

const getApiUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }
  return `http://${YOUR_COMPUTER_IP}:5000/api`;
};

const API_URL = getApiUrl();
const BASE_URL = API_URL.replace('/api', '');

/**
 * Create axios instance with default config
 */
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_CONFIG.TIMEOUT,
});

/**
 * Request interceptor: Add auth token to headers
 */
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItem(STORAGE_KEYS.TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      logger.network(config.method.toUpperCase(), config.url, config.data);
    } catch (error) {
      logger.error('Error getting token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor: Handle errors and token expiration
 */
api.interceptors.response.use(
  (response) => {
    logger.debug('API Response:', response.config.method, response.config.url, response.status);
    return response;
  },
  async (error) => {
    // Handle 401 Unauthorized - clear auth data
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthCheck = url.includes('/auth/me');
      
      try {
        await storage.removeItem(STORAGE_KEYS.TOKEN);
        await storage.removeItem(STORAGE_KEYS.USER);
        if (!isAuthCheck) {
          logger.info('Auth token cleared due to 401');
        }
      } catch (e) {
        logger.error('Error removing token:', e);
      }
      if (isAuthCheck) {
        // Return error silently for /auth/me - AuthContext will handle it
        return Promise.reject(error);
      }
    }
    
    // Handle network errors
    if (!handleNetworkError(error)) {
      // Log other errors (but skip 401 for /auth/me)
      const url = error.config?.url || '';
      const isAuthCheck = url.includes('/auth/me') && error.response?.status === 401;
      
      if (!isAuthCheck) {
        logger.error('API Error:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url,
        });
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
export { API_URL, BASE_URL };
