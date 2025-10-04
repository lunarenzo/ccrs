import { ref, onValue, off, push, set, remove, serverTimestamp } from 'firebase/database';
import { rtdb } from '../config/firebase';
import * as Notifications from 'expo-notifications';

// Notification data structure for Realtime Database
export interface RealtimeNotification {
  id: string;
  officerUid: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  timestamp: any; // serverTimestamp
  delivered?: boolean;
  seen?: boolean;
}

class RealtimeNotificationService {
  private listeners: { [officerUid: string]: any } = {};
  private notificationRef = ref(rtdb, 'notifications');

  /**
   * Start listening for real-time notifications for a specific officer
   */
  startListening(officerUid: string, onNotification: (notification: RealtimeNotification) => void) {
    const officerNotificationsRef = ref(rtdb, `notifications/${officerUid}`);
    
    const listener = onValue(officerNotificationsRef, (snapshot) => {
      const notifications = snapshot.val();
      if (!notifications) return;

      // Process new/undelivered notifications
      Object.entries(notifications).forEach(([notificationId, notification]) => {
        const notif = notification as RealtimeNotification;
        
        // Only process undelivered notifications
        if (!notif.delivered) {
          // Show local notification
          this.showLocalNotification(notif);
          
          // Mark as delivered
          this.markAsDelivered(officerUid, notificationId);
          
          // Call the callback
          onNotification({ ...notif, id: notificationId });
        }
      });
    }, (error) => {
      console.error('Error listening for notifications:', error);
    });

    this.listeners[officerUid] = { ref: officerNotificationsRef, listener };
  }

  /**
   * Stop listening for notifications for a specific officer
   */
  stopListening(officerUid: string) {
    const listenerData = this.listeners[officerUid];
    if (listenerData) {
      off(listenerData.ref, 'value', listenerData.listener);
      delete this.listeners[officerUid];
    }
  }

  /**
   * Stop all notification listeners
   */
  stopAllListening() {
    Object.keys(this.listeners).forEach(officerUid => {
      this.stopListening(officerUid);
    });
  }

  /**
   * Send a notification to a specific officer (used by admin dashboard)
   */
  async sendNotification(
    officerUid: string, 
    title: string, 
    body: string, 
    data?: Record<string, any>
  ): Promise<string> {
    try {
      const officerNotificationsRef = ref(rtdb, `notifications/${officerUid}`);
      const newNotificationRef = push(officerNotificationsRef);
      
      const notification: Omit<RealtimeNotification, 'id'> = {
        officerUid,
        title,
        body,
        data: data || {},
        timestamp: serverTimestamp(),
        delivered: false,
        seen: false,
      };

      await set(newNotificationRef, notification);
      
      const notificationId = newNotificationRef.key!;
      return notificationId;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Mark a notification as delivered (internal use)
   */
  private async markAsDelivered(officerUid: string, notificationId: string) {
    try {
      await set(ref(rtdb, `notifications/${officerUid}/${notificationId}/delivered`), true);
    } catch (error) {
      console.error('Error marking notification as delivered:', error);
    }
  }

  /**
   * Mark a notification as seen (when user opens it)
   */
  async markAsSeen(officerUid: string, notificationId: string) {
    try {
      await set(ref(rtdb, `notifications/${officerUid}/${notificationId}/seen`), true);
    } catch (error) {
      console.error('Error marking notification as seen:', error);
    }
  }

  /**
   * Get all notifications for an officer
   */
  async getNotifications(officerUid: string): Promise<RealtimeNotification[]> {
    try {
      const officerNotificationsRef = ref(rtdb, `notifications/${officerUid}`);
      
      return new Promise((resolve, reject) => {
        onValue(officerNotificationsRef, (snapshot) => {
          const notifications = snapshot.val();
          if (!notifications) {
            resolve([]);
            return;
          }

          const notificationsList = Object.entries(notifications).map(([id, notif]) => ({
            id,
            ...(notif as Omit<RealtimeNotification, 'id'>)
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
      console.error('[RealtimeNotification] Error getting notifications:', error);
      return [];
    }
  }

  /**
   * Clear old notifications (older than 30 days)
   */
  async clearOldNotifications(officerUid: string) {
    try {
      const notifications = await this.getNotifications(officerUid);
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

      const oldNotifications = notifications.filter(notif => {
        const timestamp = typeof notif.timestamp === 'number' ? notif.timestamp : 0;
        return timestamp < thirtyDaysAgo;
      });

      for (const notif of oldNotifications) {
        const notificationRef = ref(rtdb, `notifications/${officerUid}/${notif.id}`);
        await remove(notificationRef);
      }

      console.log(`Cleared ${oldNotifications.length} old notifications`);
    } catch (error) {
      console.error('Error clearing old notifications:', error);
    }
  }

  /**
   * Show a local notification
   */
  private async showLocalNotification(notification: RealtimeNotification) {
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

    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  /**
   * Send notification to a citizen (for status updates from police)
   */
  async sendCitizenNotification(
    citizenUid: string, 
    title: string, 
    body: string, 
    data?: Record<string, any>
  ): Promise<string> {
    try {
      const citizenNotificationsRef = ref(rtdb, `notifications/${citizenUid}`);
      const newNotificationRef = push(citizenNotificationsRef);
      
      const notification = {
        recipientUid: citizenUid,
        recipientType: 'citizen',
        title,
        body,
        type: data?.type || 'report_update',
        data: {
          ...data,
          senderType: 'police',
          timestamp: Date.now(),
        },
        timestamp: serverTimestamp(),
        delivered: false,
        seen: false,
        priority: 'normal',
      };

      await set(newNotificationRef, notification);
      
      const notificationId = newNotificationRef.key!;
      console.log(`[RealtimeNotification] Sent citizen notification: ${notificationId}`);
      return notificationId;
    } catch (error) {
      console.error('Error sending citizen notification:', error);
      throw error;
    }
  }

  /**
   * Send report status update to citizen from police
   */
  async sendReportStatusUpdateToCitizen(
    citizenUid: string, 
    reportId: string, 
    newStatus: string, 
    message?: string
  ): Promise<void> {
    const statusMessages: Record<string, string> = {
      accepted: 'An officer has accepted your report',
      responding: 'Officers are now responding to your report',
      resolved: 'Your report has been resolved by police',
      rejected: 'Your report has been reviewed'
    };

    await this.sendCitizenNotification(
      citizenUid,
      'Report Update from Police',
      message || statusMessages[newStatus] || `Report status: ${newStatus}`,
      {
        type: 'report_update',
        reportId,
        newStatus,
        senderType: 'police'
      }
    );
  }

  /**
   * Test the connection by sending a test notification to self
   */
  async testConnection(officerUid: string): Promise<boolean> {
    try {
      const testId = await this.sendNotification(
        officerUid,
        'Test Notification 🧪',
        'Real-time notifications are working!',
        { type: 'test', timestamp: Date.now() }
      );

      return true;
    } catch (error) {
      console.error('Test notification failed:', error);
      return false;
    }
  }
}

export const realtimeNotificationService = new RealtimeNotificationService();
export default realtimeNotificationService;