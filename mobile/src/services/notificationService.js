/**
 * Push Notification Service
 * Handle notifications cho offline messages và incoming calls
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

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
    // Check if running on web (not supported for push notifications)
    if (Platform.OS === 'web') {
      console.warn('⚠️ Push notifications not supported on web');
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
      // Get projectId from app.config.js
      const expoConfig = Constants.expoConfig || Constants.manifest || {};
      const projectId = expoConfig.extra?.EXPO_PROJECT_ID || expoConfig.projectId;
      
      // Skip push token registration if no valid projectId (Expo Go limitation)
      if (!projectId || projectId === 'vtalk-demo-project') {
        console.warn('⚠️ Push notifications require a valid Expo project ID. Using local notifications only.');
        return null;
      }
      
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
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
      // In Expo Go, push notifications are not fully supported - this is expected
      const isExpoGoError = error.message?.includes('Expo Go') || 
                           error.message?.includes('development build') ||
                           error.message?.includes('projectId');
      
      if (isExpoGoError) {
        // Silently handle Expo Go limitations (expected behavior)
        return null;
      }
      
      // Only log actual errors, not Expo Go limitations
      console.warn('⚠️ Push notification registration issue:', error.message);
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

  /**
   * Initialize notification service
   */
  async initialize() {
    try {
      await this.registerForPushNotifications();
      // Setup default listeners if needed
      // Can be customized later with setupListeners()
    } catch (error) {
      console.error('Error initializing notification service:', error);
    }
  }

  /**
   * Cleanup notification service
   */
  cleanup() {
    this.removeListeners();
  }
}

// Singleton instance
const notificationService = new NotificationService();

export default notificationService;

