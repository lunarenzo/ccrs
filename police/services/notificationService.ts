import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationData {
  type: 'assignment' | 'status_update' | 'message';
  reportId?: string;
  title: string;
  body: string;
  data?: any;
}

class NotificationService {
  private expoPushToken: string | null = null;

  // Register for push notifications and get token
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    try {
      // Attempt to resolve projectId from multiple locations
      const projectId =
        // EAS runtime config
        (Constants as any)?.easConfig?.projectId ||
        // Expo config (development/Expo Go)
        (Constants as any)?.expoConfig?.extra?.eas?.projectId ||
        (Constants as any)?.expoConfig?.projectId ||
        // Optional env override
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

      if (!projectId) {
        console.warn('[notifications] Expo projectId not found. Token retrieval may fail in development.');
      }

      const token = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      this.expoPushToken = token.data;
      console.log('Expo push token:', token.data);

      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // Get current push token
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  // Configure notification channels for Android
  async configureNotificationChannels() {
    if (Platform.OS === 'android') {
      // Default channel used when none specified
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 150],
        lightColor: '#3B82F6',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('assignment', {
        name: 'Assignment Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('status', {
        name: 'Status Updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#10B981',
        sound: 'default',
      });
    }
  }

  // Send local notification (for testing)
  async sendLocalNotification(data: PushNotificationData) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: data.title,
        body: data.body,
        data: data.data || {},
        sound: 'default',
      },
      trigger: null, // Send immediately
    });
  }

  // Listen for notification responses (when user taps notification)
  addNotificationResponseListener(callback: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Listen for notifications received while app is in foreground
  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  // Store push token in Firestore for the officer
  async storePushToken(officerUid: string, token: string) {
    try {
      const { firestoreService } = await import('./firestoreService');
      await firestoreService.storePushToken(officerUid, token);
      console.log(`Push token stored successfully for officer ${officerUid}`);
    } catch (error) {
      console.error('Error storing push token:', error);
      throw error;
    }
  }

  // Clear notification badge
  async clearBadge() {
    await Notifications.setBadgeCountAsync(0);
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export const notificationService = new NotificationService();
export default notificationService;
