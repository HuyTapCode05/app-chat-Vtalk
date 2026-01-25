import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import Constants from 'expo-constants';
import { secureStorage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';
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
  const socketRef = useRef(null);

  useEffect(() => {
    // Clean up socket if user logs out
    if (!user || !user.id) {
      if (socketRef.current) {
        console.log('🔌 Disconnecting socket on logout...');
        socketRef.current.disconnect();
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
        console.log('✅ Socket disconnected');
      }
      return;
    }

    // Create async function to handle socket setup
    const setupSocket = async () => {
      try {
        // Get token for authentication - use secureStorage with correct key
        const token = await secureStorage.getItem(STORAGE_KEYS.TOKEN);
        
        // Don't connect if no token
        if (!token) {
          console.warn('⚠️ No auth token found, skipping socket connection');
          return;
        }
        
        console.log('🔌 Setting up socket connection...', {
          socketUrl: SOCKET_URL,
          hasToken: !!token,
          tokenLength: token?.length
        });
        
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
          // Send token in handshake for authentication
          auth: {
            token: token
          },
          query: {
            token: token // Fallback for older clients
          }
        });

        newSocket.on('connect', () => {
          console.log('✅ Connected to server:', {
            socketId: newSocket.id,
            connected: newSocket.connected,
            transport: newSocket.io?.engine?.transport?.name
          });
          if (user?.id) {
            // Send join với device info
            newSocket.emit('join', {
              userId: user.id,
              platform: Constants.platform?.ios ? 'ios' : Constants.platform?.android ? 'android' : 'web',
              userAgent: Constants.platform?.web ? navigator?.userAgent : undefined,
              deviceId: Constants.installationId || Constants.deviceId
            });
            console.log('📤 Sent join event for user:', user.id);
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
          console.error('❌ Socket connection error:', {
            message: error.message,
            type: error.type,
            description: error.description,
            socketUrl: SOCKET_URL
          });
          // Don't spam logs for transport errors - they're usually temporary
          if (!error.message.includes('transport')) {
            logger.error('Non-transport connection error:', error);
          }
        });

        socketRef.current = newSocket;
        setSocket(newSocket);
      } catch (error) {
        console.error('Socket setup error:', error);
      }
    };

    setupSocket();

    // Cleanup function - use socketRef to get latest socket instance
    return () => {
      console.log('🧹 Cleaning up socket...');
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.close();
        socketRef.current = null;
      }
      setSocket(null);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={socket ?? null}>
      {children}
    </SocketContext.Provider>
  );
};

