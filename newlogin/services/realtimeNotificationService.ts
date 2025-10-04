import { ref, onValue, off, set, push, serverTimestamp } from 'firebase/database';
import { rtdb } from '../config/firebase';
import * as Notifications from 'expo-notifications';

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

// Notification data structure for Realtime Database (Citizens)
export interface CitizenRealtimeNotification {
  id: string;
  recipientUid: string;
  recipientType: 'citizen';
  title: string;
  body: string;
  type: 'report_update' | 'message' | 'resolution';
  data?: {
    reportId?: string;
    reportTitle?: string;
    oldStatus?: string;
    newStatus?: string;
    senderType?: 'admin' | 'police';
    timestamp: number;
  };
  timestamp: any; // serverTimestamp
  delivered?: boolean;
  seen?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

class CitizenRealtimeNotificationService {
  private listeners: { [citizenUid: string]: any } = {};
  
  /**
   * Start listening for real-time notifications for a specific citizen
   */
  startListening(citizenUid: string, onNotification: (notification: CitizenRealtimeNotification) => void) {
    console.log(`[CitizenNotifications] Starting listener for citizen: ${citizenUid}`);
    
    const citizenNotificationsRef = ref(rtdb, `notifications/${citizenUid}`);
    
    const listener = onValue(citizenNotificationsRef, (snapshot) => {
      const notifications = snapshot.val();
      if (!notifications) return;

      // Process new/undelivered notifications
      Object.entries(notifications).forEach(([notificationId, notification]) => {
        const notif = notification as CitizenRealtimeNotification;
        
        // Only process undelivered notifications
        if (!notif.delivered) {
          console.log(`[CitizenNotifications] New notification received:`, notif);
          
          // Show local notification
          this.showLocalNotification(notif);
          
          // Mark as delivered
          this.markAsDelivered(citizenUid, notificationId);
          
          // Call the callback
          onNotification({ ...notif, id: notificationId });
        }
      });
    }, (error) => {
      console.error('[CitizenNotifications] Error listening for notifications:', error);
    });

    this.listeners[citizenUid] = { ref: citizenNotificationsRef, listener };
  }

  /**
   * Stop listening for notifications for a specific citizen
   */
  stopListening(citizenUid: string) {
    const listenerData = this.listeners[citizenUid];
    if (listenerData) {
      off(listenerData.ref, 'value', listenerData.listener);
      delete this.listeners[citizenUid];
      console.log(`[CitizenNotifications] Stopped listener for citizen: ${citizenUid}`);
    }
  }

  /**
   * Stop all notification listeners
   */
  stopAllListening() {
    Object.keys(this.listeners).forEach(citizenUid => {
      this.stopListening(citizenUid);
    });
  }

  /**
   * Mark a notification as delivered (internal use)
   */
  private async markAsDelivered(citizenUid: string, notificationId: string) {
    try {
      await set(ref(rtdb, `notifications/${citizenUid}/${notificationId}/delivered`), true);
    } catch (error) {
      console.error('[CitizenNotifications] Error marking notification as delivered:', error);
    }
  }

  /**
   * Mark a notification as seen (when user opens it)
   */
  async markAsSeen(citizenUid: string, notificationId: string) {
    try {
      await set(ref(rtdb, `notifications/${citizenUid}/${notificationId}/seen`), true);
      console.log(`[CitizenNotifications] Marked notification ${notificationId} as seen`);
    } catch (error) {
      console.error('[CitizenNotifications] Error marking notification as seen:', error);
    }
  }

  /**
   * Get all notifications for a citizen
   */
  async getNotifications(citizenUid: string): Promise<CitizenRealtimeNotification[]> {
    try {
      const citizenNotificationsRef = ref(rtdb, `notifications/${citizenUid}`);
      
      return new Promise((resolve, reject) => {
        onValue(citizenNotificationsRef, (snapshot) => {
          const notifications = snapshot.val();
          if (!notifications) {
            resolve([]);
            return;
          }

          const notificationsList = Object.entries(notifications).map(([id, notif]) => ({
            id,
            ...(notif as Omit<CitizenRealtimeNotification, 'id'>)
          }));

          // Sort by timestamp (newest first)
          notificationsList.sort((a, b) => {
            const timestampA = typeof a.timestamp === 'number' ? a.timestamp : Date.now();
            const timestampB = typeof b.timestamp === 'number' ? b.timestamp : Date.now();
            return timestampB - timestampA;
          });

          resolve(notificationsList);
        }, reject, { onlyOnce: true });
      });
    } catch (error) {
      console.error('[CitizenNotifications] Error getting notifications:', error);
      return [];
    }
  }

  /**
   * Show a local notification
   */
  private async showLocalNotification(notification: CitizenRealtimeNotification) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: 'default',
        },
        trigger: null, // Show immediately
      });

      console.log('[CitizenNotifications] Local notification shown');
    } catch (error) {
      console.error('[CitizenNotifications] Error showing local notification:', error);
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[CitizenNotifications] Notification permissions not granted');
        return false;
      }

      console.log('[CitizenNotifications] Notification permissions granted');
      return true;
    } catch (error) {
      console.error('[CitizenNotifications] Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Configure notification channels (Android)
   */
  async configureNotificationChannels() {
    if (require('react-native').Platform.OS === 'android') {
      // Default channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 150],
        lightColor: '#3B82F6',
        sound: 'default',
      });

      // Report updates channel
      await Notifications.setNotificationChannelAsync('report_updates', {
        name: 'Report Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
        sound: 'default',
      });

      // Messages channel
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 150, 250],
        lightColor: '#F59E0B',
        sound: 'default',
      });

      console.log('[CitizenNotifications] Android notification channels configured');
    }
  }

  /**
   * Test the connection by subscribing briefly and checking connectivity
   */
  async testConnection(citizenUid: string): Promise<boolean> {
    try {
      // Test by attempting to read the notifications path
      const testRef = ref(rtdb, `notifications/${citizenUid}`);
      
      return new Promise((resolve) => {
        const testListener = onValue(testRef, () => {
          off(testRef, 'value', testListener);
          console.log('[CitizenNotifications] Connection test successful');
          resolve(true);
        }, (error) => {
          console.error('[CitizenNotifications] Connection test failed:', error);
          resolve(false);
        }, { onlyOnce: true });
      });
    } catch (error) {
      console.error('[CitizenNotifications] Test connection failed:', error);
      return false;
    }
  }
}

export const citizenRealtimeNotificationService = new CitizenRealtimeNotificationService();
export default citizenRealtimeNotificationService;