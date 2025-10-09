import { collection, addDoc, Timestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Audit Logging (Append-Only)
 * - This service writes to the `audit_logs` collection directly from the client.
 * - Firestore Security Rules (see `newlogin/firestore.rules` and `police/firestore.rules`) allow `create`
 *   for admins and law enforcement, and explicitly disallow `update`/`delete` for any role.
 * - This is Free Tier compliant (no Cloud Functions). Avoid storing PII; include only minimal metadata.
 */

export interface AuditLog {
  id?: string;
  adminUserId: string;
  adminEmail: string;
  action: string;
  targetType: 'report' | 'user' | 'system';
  targetId?: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

class AuditService {
  // Log admin actions
  async logAction(auditData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      // Filter out undefined values to prevent Firestore errors
      const cleanedData = Object.fromEntries(
        Object.entries({
          ...auditData,
          timestamp: Timestamp.now()
        }).filter(([_, value]) => value !== undefined)
      );
      
      await addDoc(collection(db, 'audit_logs'), cleanedData);
    } catch (error) {
      console.error('Failed to log audit action:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  // Get recent audit logs
  async getRecentLogs(limitCount: number = 50): Promise<AuditLog[]> {
    try {
      const q = query(
        collection(db, 'audit_logs'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const logs: AuditLog[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        logs.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        } as AuditLog);
      });

      return logs;
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      return [];
    }
  }

  // Log report status changes
  async logReportStatusChange(
    adminUserId: string,
    adminEmail: string,
    reportId: string,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    await this.logAction({
      adminUserId,
      adminEmail,
      action: 'report_status_change',
      targetType: 'report',
      targetId: reportId,
      details: {
        oldStatus,
        newStatus,
        changeType: 'status_update'
      }
    });
  }

  // Log user status changes
  async logUserStatusChange(
    adminUserId: string,
    adminEmail: string,
    targetUserId: string,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    await this.logAction({
      adminUserId,
      adminEmail,
      action: 'user_status_change',
      targetType: 'user',
      targetId: targetUserId,
      details: {
        oldStatus,
        newStatus,
        changeType: 'status_update'
      }
    });
  }

  // Log user role changes
  async logUserRoleChange(
    adminUserId: string,
    adminEmail: string,
    targetUserId: string,
    oldRole: string,
    newRole: string
  ): Promise<void> {
    await this.logAction({
      adminUserId,
      adminEmail,
      action: 'user_role_change',
      targetType: 'user',
      targetId: targetUserId,
      details: {
        oldRole,
        newRole,
        changeType: 'role_update'
      }
    });
  }

  // Log report deletions
  async logReportDeletion(
    adminUserId: string,
    adminEmail: string,
    reportId: string,
    reportDetails: any
  ): Promise<void> {
    await this.logAction({
      adminUserId,
      adminEmail,
      action: 'report_deletion',
      targetType: 'report',
      targetId: reportId,
      details: {
        deletedReport: reportDetails,
        changeType: 'deletion'
      }
    });
  }

  // Log admin login
  async logAdminLogin(
    adminUserId: string,
    adminEmail: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAction({
      adminUserId,
      adminEmail,
      action: 'admin_login',
      targetType: 'system',
      details: {
        loginMethod: 'firebase_auth',
        changeType: 'authentication'
      },
      ipAddress,
      userAgent
    });
  }

  // Log admin logout
  async logAdminLogout(
    adminUserId: string,
    adminEmail: string
  ): Promise<void> {
    await this.logAction({
      adminUserId,
      adminEmail,
      action: 'admin_logout',
      targetType: 'system',
      details: {
        changeType: 'authentication'
      }
    });
  }
}

export const auditService = new AuditService();
export default auditService;
