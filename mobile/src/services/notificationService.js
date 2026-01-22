/**
 * Push Notification Service
 * Handle notifications cho offline messages và incoming calls
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  /**
   * Register for push notifications
   */
  async registerForPushNotifications() {
    if (!Device.isDevice) {
      console.warn('⚠️ Must use physical device for Push Notifications');
      return null;
    }

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Failed to get push token for push notification!');
        return null;
      }

      // Get Expo push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // Cần update với project ID thực tế
      });

      this.expoPushToken = token.data;
      console.log('✅ Push token:', this.expoPushToken);

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00B14F',
        });
      }

      return this.expoPushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Send local notification
   */
  async sendLocalNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  /**
   * Send notification for new message
   */
  async notifyNewMessage(message, senderName, conversationName) {
    const title = conversationName || senderName || 'Tin nhắn mới';
    const body = message.type === 'text' 
      ? message.content 
      : message.type === 'image' 
        ? '📷 Hình ảnh'
        : message.type === 'voice'
          ? '🎤 Tin nhắn thoại'
          : 'Tin nhắn mới';

    await this.sendLocalNotification(title, body, {
      type: 'message',
      conversationId: message.conversation,
      messageId: message._id,
    });
  }

  /**
   * Send notification for incoming call
   */
  async notifyIncomingCall(callData) {
    const { fromUserId, userName, callType } = callData;
    const title = callType === 'video' ? '📹 Cuộc gọi video' : '📞 Cuộc gọi thoại';
    const body = `${userName} đang gọi bạn`;

    await this.sendLocalNotification(title, body, {
      type: 'call',
      callId: callData.callId,
      fromUserId,
      callType,
    });
  }

  /**
   * Setup notification listeners
   */
  setupListeners(onNotificationReceived, onNotificationTapped) {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification received:', notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    // Listener for when user taps notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      if (onNotificationTapped) {
        onNotificationTapped(response);
      }
    });
  }

  /**
   * Remove listeners
   */
  removeListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get badge count
   */
  async getBadgeCount() {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count) {
    await Notifications.setBadgeCountAsync(count);
  }
}

// Singleton instance
const notificationService = new NotificationService();

export default notificationService;

