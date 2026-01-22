/**
 * Push Notification Service (Backend)
 * Send push notifications via Expo Push Notification service
 */

const axios = require('axios');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send push notification
 */
async function sendPushNotification(expoPushToken, title, body, data = {}) {
  try {
    const message = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
      channelId: 'default',
    };

    const response = await axios.post(EXPO_PUSH_URL, message, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Push notification sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    throw error;
  }
}

/**
 * Send notification for new message
 */
async function notifyNewMessage(message, senderName, conversationName, expoPushToken) {
  const title = conversationName || senderName || 'Tin nhắn mới';
  let body = '';

  if (message.type === 'text') {
    body = message.content || 'Tin nhắn mới';
  } else if (message.type === 'image') {
    body = '📷 Hình ảnh';
  } else if (message.type === 'voice') {
    body = '🎤 Tin nhắn thoại';
  } else {
    body = 'Tin nhắn mới';
  }

  // Truncate body if too long
  if (body.length > 100) {
    body = body.substring(0, 100) + '...';
  }

  return sendPushNotification(expoPushToken, title, body, {
    type: 'message',
    conversationId: message.conversation,
    messageId: message._id,
    senderId: message.sender,
  });
}

/**
 * Send notification for incoming call
 */
async function notifyIncomingCall(expoPushToken, callData) {
  const { fromUserId, userName, callType } = callData;
  const title = callType === 'video' ? '📹 Cuộc gọi video' : '📞 Cuộc gọi thoại';
  const body = `${userName} đang gọi bạn`;

  return sendPushNotification(expoPushToken, title, body, {
    type: 'call',
    callId: callData.callId,
    fromUserId,
    callType,
  });
}

/**
 * Send multiple notifications (batch)
 */
async function sendBatchNotifications(notifications) {
  try {
    const messages = notifications.map(({ expoPushToken, title, body, data }) => ({
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
    }));

    const response = await axios.post(EXPO_PUSH_URL, messages, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Batch push notifications sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error sending batch push notifications:', error);
    throw error;
  }
}

module.exports = {
  sendPushNotification,
  notifyNewMessage,
  notifyIncomingCall,
  sendBatchNotifications,
};

