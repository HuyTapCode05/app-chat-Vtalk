import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import storage, { secureStorage } from '../utils/storage';
import api from '../config/api';
import { logger } from '../utils/logger';
import { STORAGE_KEYS } from '../utils/constants';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Test backend connection on app start
    const testBackendConnection = async () => {
      try {
        console.log('🔍 Testing backend connection...');
        const res = await api.get('/health');
        console.log('✅ Backend connected:', res.data);
      } catch (error) {
        console.error('❌ Backend connection failed:', error.message);
        console.error('Backend URL:', error.config?.baseURL);
      }
    };

    testBackendConnection();
    
    // Set timeout to ensure loading state doesn't hang forever
    const loadingTimeout = setTimeout(() => {
      console.warn('⚠️ Auth check timeout, setting loading to false');
      setLoading(false);
    }, 5000); // 5 second timeout

    checkAuth()
      .catch((error) => {
        console.error('checkAuth error:', error);
        setLoading(false); // Ensure loading is set to false on error
      })
      .finally(() => {
        clearTimeout(loadingTimeout);
      });
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const token = await secureStorage.getItem(STORAGE_KEYS.TOKEN);
      const savedUser = await storage.getItem(STORAGE_KEYS.USER);
      
      if (token && savedUser) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
          await storage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.data.user));
          logger.success('User authenticated');
        } catch (error) {
          // Token expired or invalid - this is expected and handled gracefully
          if (error.response?.status === 401) {
            logger.info('Token expired or invalid, clearing auth');
          } else {
            logger.warn('Token verification failed:', error.response?.status || error.message);
          }
          // Clear invalid token and user data
          await secureStorage.removeItem(STORAGE_KEYS.TOKEN);
          await storage.removeItem(STORAGE_KEYS.USER);
          setUser(null);
        }
      } else {
        // No token or user saved - user needs to login
        setUser(null);
      }
    } catch (error) {
      logger.error('Auth check error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user } = res.data;
    await secureStorage.setItem(STORAGE_KEYS.TOKEN, token);
    await storage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    setUser(user);
    logger.success('User logged in');
    return { token, user };
  }, []);

  const register = useCallback(async (username, email, password, fullName) => {
    try {
      logger.info('Registering user...', { username, email });
      console.log('📝 Register API call:', {
        url: '/auth/register',
        data: { username, email, password: '***', fullName }
      });
      
      const res = await api.post('/auth/register', {
        username,
        email,
        password,
        fullName,
      });
      
      console.log('✅ Register success:', res.data);
      logger.info('Register API response:', res.data);
      
      const { token, user, requiresVerification, verificationMethod } = res.data;
      
      if (!token || !user) {
        throw new Error('Invalid response from server');
      }
      
      await storage.setItem(STORAGE_KEYS.TOKEN, token);
      await storage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      setUser(user);
      logger.success('User registered successfully');
      return { token, user, requiresVerification, verificationMethod };
    } catch (error) {
      console.error('❌ Register error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      
      logger.error('Register error:', error);
      logger.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error; // Re-throw để RegisterScreen có thể handle
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      logger.info('Starting logout process...');
      
      // Try to call logout API first (before clearing user)
      try {
        await api.post('/auth/logout');
        logger.success('Logout API called successfully');
      } catch (error) {
        // Ignore API errors on logout (may fail if token already invalid)
        logger.warn('Logout API call failed (this is okay)');
      }
      
      // Clear storage
      await storage.removeItem(STORAGE_KEYS.TOKEN);
      await storage.removeItem(STORAGE_KEYS.USER);
      logger.success('Storage cleared');
      
      setUser(null);
      logger.success('User state cleared - navigation should reset to Login');
      
      // On web, force reload to ensure clean state
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
      
    } catch (error) {
      logger.error('Logout error:', error);
      try {
        await storage.removeItem(STORAGE_KEYS.TOKEN);
        await storage.removeItem(STORAGE_KEYS.USER);
        setUser(null);
        logger.success('Forced cleanup completed');
      } catch (cleanupError) {
        logger.error('Cleanup error:', cleanupError);
      }
    }
  }, []);

  const value = useMemo(() => ({
    user,
    setUser,
    login,
    register,
    logout,
    loading,
  }), [user, login, register, logout, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

