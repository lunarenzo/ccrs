/*
  Admin Realtime Push Service (Free Tier compliant)
  - Uses Firebase Realtime Database to send notifications to officers
  - Officers listen in real-time and show local notifications
  - No Cloud Functions, FCM, or paid features required
*/

import { ref, push, set, serverTimestamp } from 'firebase/database';
import { rtdb } from '../config/firebase';

export interface RealtimeNotificationPayload {
  officerUid: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  type?: 'assignment' | 'status_update' | 'message';
}

export interface CitizenNotificationPayload {
  citizenUid: string;
  title: string;
  body: string;
  data?: {
    reportId?: string;
    reportTitle?: string;
    oldStatus?: string;
    newStatus?: string;
    senderType?: 'admin' | 'police';
    timestamp: number;
  };
  type?: 'report_update' | 'message' | 'resolution';
}

interface RealtimeNotificationData {
  officerUid: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  timestamp: any; // serverTimestamp
  delivered: boolean;
  seen: boolean;
}

interface CitizenNotificationData {
  recipientUid: string;
  recipientType: 'citizen';
  title: string;
  body: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: any; // serverTimestamp
  delivered: boolean;
  seen: boolean;
  priority?: string;
}

export class RealtimePushService {
  /**
   * Send a notification to a specific officer via Realtime Database
   */
  async sendNotification(payload: RealtimeNotificationPayload): Promise<void> {
    try {
      const officerNotificationsRef = ref(rtdb, `notifications/${payload.officerUid}`);
      const newNotificationRef = push(officerNotificationsRef);
      
      const notificationData: RealtimeNotificationData = {
        officerUid: payload.officerUid,
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        timestamp: serverTimestamp(),
        delivered: false,
        seen: false,
      };

      await set(newNotificationRef, notificationData);
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Send notifications to multiple officers
   */
  async sendBatch(
    officerUids: string[], 
    title: string, 
    body: string, 
    data?: Record<string, unknown>
  ): Promise<{ ok: string[]; failed: Array<{ officerUid: string; error: string }> }> {
    const ok: string[] = [];
    const failed: Array<{ officerUid: string; error: string }> = [];

    for (const officerUid of officerUids) {
      try {
        await this.sendNotification({
          officerUid,
          title,
          body,
          data,
        });
        ok.push(officerUid);
      } catch (error) {
        failed.push({
          officerUid,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { ok, failed };
  }

  /**
   * Send assignment notification to an officer
   */
  async sendAssignmentNotification(
    officerUid: string, 
    reportId: string, 
    reportTitle: string
  ): Promise<void> {
    await this.sendNotification({
      officerUid,
      title: 'New Assignment',
      body: `You have been assigned to: ${reportTitle}`,
      data: {
        type: 'assignment',
        reportId,
        reportTitle,
        timestamp: Date.now(),
      },
      type: 'assignment',
    });
  }

  /**
   * Send a notification to a specific citizen via Realtime Database
   */
  async sendCitizenNotification(payload: CitizenNotificationPayload): Promise<void> {
    try {
      const citizenNotificationsRef = ref(rtdb, `notifications/${payload.citizenUid}`);
      const newNotificationRef = push(citizenNotificationsRef);
      
      const notificationData: CitizenNotificationData = {
        recipientUid: payload.citizenUid,
        recipientType: 'citizen',
        title: payload.title,
        body: payload.body,
        type: payload.type || 'report_update',
        data: payload.data || {},
        timestamp: serverTimestamp(),
        delivered: false,
        seen: false,
        priority: 'normal',
      };

      await set(newNotificationRef, notificationData);
    } catch (error) {
      console.error('Error sending citizen notification:', error);
      throw error;
    }
  }

  /**
   * Send report status update notification to citizen
   */
  async sendReportStatusUpdate(
    citizenUid: string, 
    reportId: string, 
    reportTitle: string,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    const statusMessages: Record<string, string> = {
      validated: 'Your report has been reviewed and validated',
      responding: 'Officers are now responding to your report',
      resolved: 'Your report has been resolved',
      rejected: 'Your report requires additional information'
    };

    await this.sendCitizenNotification({
      citizenUid,
      title: 'Report Status Update',
      body: statusMessages[newStatus] || `Report status changed to ${newStatus}`,
      data: {
        reportId,
        reportTitle,
        oldStatus,
        newStatus,
        senderType: 'admin',
        timestamp: Date.now(),
      },
      type: 'report_update',
    });
  }

  /**
   * Test if the service is working by sending a test notification
   */
  async testConnection(officerUid: string): Promise<boolean> {
    try {
      await this.sendNotification({
        officerUid,
        title: 'Test from Admin 🚨',
        body: 'Realtime notifications are working!',
        data: {
          type: 'test',
          source: 'admin_dashboard',
          timestamp: Date.now(),
        },
      });
      
      return true;
    } catch (error) {
      console.error('Test notification failed:', error);
      return false;
    }
  }

  /**
   * Test citizen notification by sending a test to a citizen
   */
  async testCitizenConnection(citizenUid: string): Promise<boolean> {
    try {
      await this.sendCitizenNotification({
        citizenUid,
        title: 'Test from Admin 🚨',
        body: 'Your reports will receive real-time updates!',
        data: {
          senderType: 'admin',
          timestamp: Date.now(),
        },
        type: 'message',
      });
      
      return true;
    } catch (error) {
      console.error('Test citizen notification failed:', error);
      return false;
    }
  }
}

export const realtimePushService = new RealtimePushService();