/**
 * IncomingCallHandler Component
 * Handles incoming call notifications and navigation
 */

import React, { useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api, { BASE_URL } from '../config/api';
import { logger } from '../utils/logger';
import { getImageUrl } from '../utils/helpers';

const IncomingCallHandler = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const socket = useSocket();

  const handleIncomingCall = useCallback(async (data) => {
    const { callId, fromUserId, callType } = data;
    
    logger.info('Incoming call received:', { callId, fromUserId, callType });
    
    try {
      // Get caller info
      const res = await api.get(`/users/${fromUserId}`);
      const caller = res.data;

      logger.debug('Caller info:', caller);

      // Navigate to call screen
      navigation.navigate('Call', {
        callType: callType || 'voice',
        userId: fromUserId,
        userName: caller.fullName || 'User',
        userAvatar: getImageUrl(caller.avatar, BASE_URL),
        callId,
        isIncoming: true,
      });
    } catch (error) {
      logger.error('Error handling incoming call:', error);
      // Still navigate even if we can't get user info
      navigation.navigate('Call', {
        callType: callType || 'voice',
        userId: fromUserId,
        userName: 'User',
        userAvatar: null,
        callId,
        isIncoming: true,
      });
    }
  }, [navigation]);

  useEffect(() => {
    if (!socket || !user) return;

    socket.on('incoming-call', handleIncomingCall);

    return () => {
      socket.off('incoming-call', handleIncomingCall);
    };
  }, [socket, user, handleIncomingCall]);

  return null;
};

export default IncomingCallHandler;

