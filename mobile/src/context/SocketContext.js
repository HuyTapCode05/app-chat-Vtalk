import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import Constants from 'expo-constants';
import { SOCKET_CONFIG } from '../utils/env';
import { logger } from '../utils/logger';

const SocketContext = createContext();

// Get SOCKET_URL from app.config.js, with safe fallback for web
const expoConfig = Constants.expoConfig || Constants.manifest || {};
const SOCKET_URL = expoConfig.extra?.SOCKET_URL || 'http://localhost:5000';

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context; 
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Clean up socket if user logs out
    if (!user || !user.id) {
      if (socket) {
        console.log('🔌 Disconnecting socket on logout...');
        socket.disconnect();
        socket.close();
        setSocket(null);
        console.log('✅ Socket disconnected');
      }
      return;
    }

    try {
      const newSocket = io(SOCKET_URL, {
        transports: ['polling', 'websocket'], // Try polling first for better web compatibility
        upgrade: true, // Allow upgrade from polling to websocket
        rememberUpgrade: true, // Remember transport preference
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        timeout: 20000,
        forceNew: false, // Reuse existing connection if available
        autoConnect: true,
      });

      newSocket.on('connect', () => {
        console.log('✅ Connected to server');
        if (user?.id) {
          newSocket.emit('join', user.id);
        }
      });

      newSocket.on('disconnect', (reason) => {
        logger.warn('❌ Disconnected from server:', reason);
        // Don't auto-reconnect on transport error - let it handle naturally
        // Transport errors are usually temporary and will reconnect automatically
        if (reason === 'io server disconnect') {
          // Server disconnected us, try to reconnect
          newSocket.connect();
        }
        // Other reasons (transport error, ping timeout) will auto-reconnect
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Reconnected to server (attempt', attemptNumber, ')');
        if (user?.id) {
          newSocket.emit('join', user.id);
        }
      });

      newSocket.on('reconnect_attempt', () => {
        console.log('🔄 Attempting to reconnect...');
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('Reconnection error:', error);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('❌ Failed to reconnect to server');
      });

      newSocket.on('connect_error', (error) => {
        logger.error('Socket connection error:', error.message);
        // Don't spam logs for transport errors - they're usually temporary
        if (!error.message.includes('transport')) {
          logger.error('Non-transport connection error:', error);
        }
      });

      setSocket(newSocket);

      return () => {
        console.log('🧹 Cleaning up socket...');
        newSocket.removeAllListeners();
        newSocket.close();
        setSocket(null);
      };
    } catch (error) {
      console.error('Socket setup error:', error);
    }
  }, [user]);

  return (
    <SocketContext.Provider value={socket ?? null}>
      {children}
    </SocketContext.Provider>
  );
};

