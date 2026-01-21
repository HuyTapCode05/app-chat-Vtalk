import { Platform } from 'react-native';
import { logger } from './logger';
import { BASE_URL } from '../config/api';
import { getImageUrl } from './helpers';

// Conditionally import expo-notifications (not available on web)
let Notifications = null;
if (Platform.OS !== 'web') {
  try {
    // Skip expo-notifications in development to avoid projectId issues
    if (__DEV__) {
      console.warn('⚠️ expo-notifications disabled in development');
    } else {
      Notifications = require('expo-notifications');
      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    }
  } catch (error) {
    console.warn('expo-notifications not available:', error);
  }
}

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.isInitialized = false;
  }

  /**
   * Initialize notification service
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Skip initialization in Expo Go to avoid projectId errors
      if (__DEV__ && typeof __expo !== 'undefined' && __expo?.Constants?.appOwnership === 'expo') {
        logger.warn('⚠️ Notifications disabled in Expo Go');
        return false;
      }

      // On web, use browser Notification API
      if (Platform.OS === 'web') {
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            this.isInitialized = true;
            logger.info('✅ Notification service initialized (web)');
            return true;
          } else {
            logger.warn('⚠️ Notification permission not granted (web)');
            return false;
          }
        } else {
          logger.warn('⚠️ Browser does not support notifications');
          return false;
        }
      }

      // For mobile, use expo-notifications
      if (!Notifications) {
        logger.warn('⚠️ expo-notifications not available');
        return false;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        logger.warn('⚠️ Notification permission not granted');
        return false;
      }

      // Get push token (for mobile)
      const tokenData = await Notifications.getExpoPushTokenAsync();
      this.expoPushToken = tokenData.data;
      logger.info('📱 Expo Push Token:', this.expoPushToken);

      // Setup notification listeners
      this.setupListeners();

      this.isInitialized = true;
      logger.info('✅ Notification service initialized');
      return true;
    } catch (error) {
      logger.error('❌ Error initializing notifications:', error);
      return false;
    }
  }

  /**
   * Setup notification listeners
   */
  setupListeners() {
    if (!Notifications || Platform.OS === 'web') {
      return;
    }

    // Listen for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      logger.info('📬 Notification received:', notification.request.content.title);
    });

    // Listen for user tapping on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      logger.info('👆 Notification tapped:', response.notification.request.content.data);
      // Handle navigation if needed
      const data = response.notification.request.content.data;
      if (data?.conversationId) {
        // Navigation will be handled by the component that uses this service
        return data;
      }
    });
  }

  /**
   * Show local notification
   */
  async showNotification(title, body, data = {}) {
    try {
      console.log('📬 showNotification called:', { title, body, platform: Platform.OS });
      
      // Check if we're on web
      if (Platform.OS === 'web') {
        // Use browser Notification API
        if ('Notification' in window) {
          let permission = Notification.permission;
          if (permission === 'default') {
            permission = await Notification.requestPermission();
          }
          
          if (permission === 'granted') {
            console.log('✅ Creating browser notification');
            
            // Use avatar if available, otherwise use default icon
            const icon = data.avatarUrl || '/icon.png';
            
            // For image messages, show image in notification (if supported)
            const notificationOptions = {
              body,
              icon,
              badge: icon,
              tag: data.conversationId || 'message',
              data,
              requireInteraction: false, // Auto close
              silent: false, // Play sound
            };
            
            // Some browsers support image in notification
            if (data.imageUrl && 'image' in Notification.prototype) {
              notificationOptions.image = data.imageUrl;
            }
            
            const notification = new Notification(title, notificationOptions);
            
            // Handle click - navigate to conversation
            notification.onclick = (event) => {
              event.preventDefault();
              window.focus();
              // Navigation will be handled by the app
              if (data.conversationId) {
                // Dispatch custom event for navigation
                window.dispatchEvent(new CustomEvent('notification-clicked', {
                  detail: { conversationId: data.conversationId }
                }));
              }
              notification.close();
            };
            
            // Auto close after 5 seconds
            setTimeout(() => {
              notification.close();
            }, 5000);
          } else {
            console.warn('⚠️ Notification permission denied:', permission);
          }
        } else {
          console.warn('⚠️ Browser does not support Notification API');
        }
        return;
      }

      // Use Expo Notifications for mobile
      if (!Notifications) {
        logger.warn('⚠️ expo-notifications not available');
        return;
      }
      
      // Build notification content with avatar and image
      const notificationContent = {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 250, 250, 250],
      };
      
      // Add avatar as icon (Android)
      if (data.avatarUrl && Platform.OS === 'android') {
        notificationContent.android = {
          ...notificationContent.android,
          smallIcon: data.avatarUrl,
          largeIcon: data.avatarUrl,
        };
      }
      
      // Add image attachment if available (iOS/Android)
      if (data.imageUrl) {
        notificationContent.attachments = [
          {
            identifier: data.imageUrl,
            url: data.imageUrl,
            type: 'image',
          }
        ];
      }
      
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Show immediately
      });
    } catch (error) {
      logger.error('❌ Error showing notification:', error);
    }
  }

  /**
   * Show notification for new message
   */
  async showMessageNotification(message, conversation, currentUserId) {
    try {
      console.log('📨 showMessageNotification called:', {
        messageId: message._id || message.id,
        conversationId: conversation?._id || conversation?.id,
        currentUserId
      });
      
      // Don't show notification if message is from current user
      const senderId = message.sender?._id || message.sender?.id || message.sender;
      if (senderId === currentUserId) {
        console.log('🔕 Skipping notification - message from current user');
        return;
      }

      // Don't show notification if user is currently viewing this conversation
      // This will be handled by the component that calls this

      const conversationId = conversation?._id || conversation?.id || message.conversation?._id || message.conversation?.id || message.conversation;
      
      // Get conversation name
      let conversationName = 'Tin nhắn mới';
      if (conversation?.type === 'group') {
        conversationName = conversation.name || 'Nhóm';
      } else {
        // Private chat - use sender name
        const sender = message.sender;
        if (sender) {
          conversationName = sender.fullName || sender.username || 'Người dùng';
        }
      }

      // Get message preview
      let messageBody = '';
      let imageUrl = null;
      if (message.type === 'text') {
        messageBody = message.content || '';
      } else if (message.type === 'image') {
        messageBody = '📷 Đã gửi một ảnh';
        // Get image URL for preview
        if (message.content) {
          imageUrl = getImageUrl(message.content, BASE_URL);
        }
      } else if (message.type === 'file') {
        messageBody = '📎 Đã gửi một tệp';
      } else {
        messageBody = 'Đã gửi một tin nhắn';
      }

      // Get sender avatar
      let avatarUrl = null;
      const sender = message.sender;
      if (sender?.avatar) {
        avatarUrl = getImageUrl(sender.avatar, BASE_URL);
      } else if (conversation?.type === 'group' && conversation?.avatar) {
        avatarUrl = getImageUrl(conversation.avatar, BASE_URL);
      }

      await this.showNotification(
        conversationName,
        messageBody,
        {
          conversationId,
          messageId: message._id || message.id,
          type: 'message',
          avatarUrl,
          imageUrl,
          senderName: sender?.fullName || sender?.username || 'Người dùng',
        }
      );
    } catch (error) {
      logger.error('❌ Error showing message notification:', error);
    }
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications() {
    try {
      if (Platform.OS === 'web' || !Notifications) {
        return;
      }
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      logger.error('❌ Error canceling notifications:', error);
    }
  }

  /**
   * Get badge count (unread messages)
   */
  async setBadgeCount(count) {
    try {
      if (Platform.OS === 'web' || !Notifications) {
        return;
      }
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      logger.error('❌ Error setting badge count:', error);
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (Platform.OS !== 'web' && Notifications) {
      if (this.notificationListener) {
        Notifications.removeNotificationSubscription(this.notificationListener);
        this.notificationListener = null;
      }
      if (this.responseListener) {
        Notifications.removeNotificationSubscription(this.responseListener);
        this.responseListener = null;
      }
    }
    this.isInitialized = false;
  }

  /**
   * Get expo push token
   */
  getExpoPushToken() {
    return this.expoPushToken;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;

