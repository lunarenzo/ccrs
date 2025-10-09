/**
 * Case Status Manager
 * Sprint 2: Investigation & Approval Workflows
 * 
 * Implements a finite state machine for validating case status transitions
 * with comprehensive validation logic and status history tracking.
 */

import { Timestamp, runTransaction, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase'; // Adjust import path as needed
import { 
  CaseStatus, 
  StatusHistoryEntry, 
  WorkflowValidation, 
  EnhancedCCRSReport,
  VALID_STATUS_TRANSITIONS,
  CASE_STATUS_LABELS
} from '../../shared-types/sprint2-interfaces';

export interface StatusTransitionContext {
  reportId: string;
  currentUserId: string;
  userRole: string;
  notes: string;
  metadata?: Record<string, any>;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface StatusTransitionResult {
  success: boolean;
  newStatus?: CaseStatus;
  statusHistoryId?: string;
  errorMessage?: string;
  warnings?: string[];
}

export class CaseStatusManager {
  /**
   * Validate if a status transition is allowed
   */
  static validateTransition(
    fromStatus: CaseStatus,
    toStatus: CaseStatus,
    userRole: string,
    context?: Record<string, any>
  ): WorkflowValidation {
    // Check if transition is valid according to state machine
    const allowedTransitions = VALID_STATUS_TRANSITIONS[fromStatus] || [];
    
    if (!allowedTransitions.includes(toStatus)) {
      return {
        isValid: false,
        currentStatus: fromStatus,
        targetStatus: toStatus,
        errorMessage: `Invalid transition from ${CASE_STATUS_LABELS[fromStatus]} to ${CASE_STATUS_LABELS[toStatus]}`,
        requiredRole: this.getRequiredRoleForTransition(fromStatus, toStatus)
      };
    }

    // Check if user has the required role for this transition
    const requiredRole = this.getRequiredRoleForTransition(fromStatus, toStatus);
    const hasPermission = this.checkRolePermission(userRole, requiredRole);
    
    if (!hasPermission) {
      return {
        isValid: false,
        currentStatus: fromStatus,
        targetStatus: toStatus,
        errorMessage: `Role '${userRole}' is not authorized to perform this transition. Required: ${requiredRole}`,
        requiredRole: requiredRole
      };
    }

    // Check for required fields based on transition
    const requiredFields = this.getRequiredFieldsForTransition(fromStatus, toStatus);
    const missingFields = requiredFields.filter(field => !context?.[field]);
    
    if (missingFields.length > 0) {
      return {
        isValid: false,
        currentStatus: fromStatus,
        targetStatus: toStatus,
        errorMessage: `Missing required fields: ${missingFields.join(', ')}`,
        requiredFields: missingFields,
        requiredRole: requiredRole
      };
    }

    return {
      isValid: true,
      currentStatus: fromStatus,
      targetStatus: toStatus,
      requiredRole: requiredRole
    };
  }

  /**
   * Get required role for a specific transition
   */
  private static getRequiredRoleForTransition(fromStatus: CaseStatus, toStatus: CaseStatus): string {
    const transitionRoles: Record<string, string> = {
      // Desk Officer transitions
      'pending->validated': 'desk_officer',
      'pending->rejected': 'desk_officer',
      'validated->assigned': 'desk_officer',
      
      // Investigator transitions
      'assigned->accepted': 'investigator',
      'assigned->declined': 'investigator',
      'accepted->responding': 'investigator',
      'responding->investigating': 'investigator',
      'investigating->resolved': 'investigator',
      'investigating->investigating': 'investigator', // Status update within investigating
      
      // Supervisor transitions
      'resolved->closed': 'supervisor',
      'resolved->investigating': 'supervisor', // Reopen case
      'closed->archived': 'supervisor',
      
      // Special transitions that multiple roles can perform
      'any->rejected': 'investigator' // Investigators and supervisors can reject
    };

    const transitionKey = `${fromStatus}->${toStatus}`;
    return transitionRoles[transitionKey] || transitionRoles['any->rejected'] || 'admin';
  }

  /**
   * Check if user role has permission for transition
   */
  private static checkRolePermission(userRole: string, requiredRole: string): boolean {
    // Role hierarchy and permissions
    const roleHierarchy: Record<string, string[]> = {
      'admin': ['admin', 'supervisor', 'investigator', 'desk_officer', 'officer'],
      'supervisor': ['supervisor', 'investigator', 'officer'],
      'investigator': ['investigator'],
      'desk_officer': ['desk_officer'],
      'officer': ['investigator'] // Officers can act as investigators
    };

    const allowedRoles = roleHierarchy[userRole] || [];
    return allowedRoles.includes(requiredRole) || userRole === 'admin';
  }

  /**
   * Get required fields for specific transitions
   */
  private static getRequiredFieldsForTransition(fromStatus: CaseStatus, toStatus: CaseStatus): string[] {
    const transitionRequirements: Record<string, string[]> = {
      'pending->validated': ['triageLevel'],
      'pending->rejected': ['notes'],
      'validated->assigned': ['assignedTo'],
      'assigned->accepted': ['notes'],
      'assigned->declined': ['notes'],
      'accepted->responding': ['notes'],
      'responding->investigating': ['notes'],
      'investigating->resolved': ['notes'],
      'resolved->closed': ['notes'],
      'resolved->investigating': ['notes'],
      'closed->archived': ['notes']
    };

    const transitionKey = `${fromStatus}->${toStatus}`;
    return transitionRequirements[transitionKey] || ['notes'];
  }

  /**
   * Perform a status transition with full validation and history tracking
   */
  static async performTransition(
    context: StatusTransitionContext
  ): Promise<StatusTransitionResult> {
    try {
      const result = await runTransaction(db, async (transaction) => {
        // Get current report data
        const reportRef = doc(db, 'reports', context.reportId);
        const reportSnap = await transaction.get(reportRef);
        
        if (!reportSnap.exists()) {
          throw new Error('Report not found');
        }

        const reportData = reportSnap.data() as EnhancedCCRSReport;
        const currentStatus = reportData.status;

        // Determine target status (this could be passed in context or derived)
        const targetStatus = this.determineTargetStatus(currentStatus, context);
        
        // Validate transition
        const validation = this.validateTransition(
          currentStatus,
          targetStatus,
          context.userRole,
          {
            notes: context.notes,
            assignedTo: context.metadata?.assignedTo,
            triageLevel: context.metadata?.triageLevel
          }
        );

        if (!validation.isValid) {
          throw new Error(validation.errorMessage || 'Invalid transition');
        }

        // Create status history entry
        const historyEntry: StatusHistoryEntry = {
          id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: targetStatus,
          previousStatus: currentStatus,
          timestamp: Timestamp.now(),
          officerId: context.currentUserId,
          officerRole: context.userRole,
          notes: context.notes,
          location: context.location,
          metadata: context.metadata
        };

        // Update report with new status and history
        const updatedStatusHistory = [...(reportData.statusHistory || []), historyEntry];
        
        const updateData: Partial<EnhancedCCRSReport> = {
          status: targetStatus,
          statusHistory: updatedStatusHistory,
          updatedAt: Timestamp.now(),
          currentOfficerId: context.currentUserId
        };

        // Add specific fields based on transition
        if (targetStatus === 'assigned' && context.metadata?.assignedTo) {
          updateData.currentOfficerId = context.metadata.assignedTo;
        }

        if (targetStatus === 'investigating' && !reportData.investigationStartedAt) {
          updateData.investigationStartedAt = Timestamp.now();
        }

        if (targetStatus === 'resolved' && reportData.investigationStartedAt) {
          const startTime = reportData.investigationStartedAt.toMillis();
          const endTime = Date.now();
          updateData.investigationDuration = Math.round((endTime - startTime) / (1000 * 60 * 60)); // hours
        }

        // Apply update
        transaction.update(reportRef, updateData);

        return {
          success: true,
          newStatus: targetStatus,
          statusHistoryId: historyEntry.id
        };
      });

      return result;

    } catch (error) {
      console.error('Status transition error:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Determine target status based on current status and context
   * This is a simple implementation - you might want more sophisticated logic
   */
  private static determineTargetStatus(currentStatus: CaseStatus, context: StatusTransitionContext): CaseStatus {
    // This could be passed explicitly in context, or derived from user action
    if (context.metadata?.targetStatus) {
      return context.metadata.targetStatus as CaseStatus;
    }

    // Default next status progression
    const defaultProgressions: Record<CaseStatus, CaseStatus> = {
      pending: 'validated',
      validated: 'assigned',
      assigned: 'accepted',
      accepted: 'responding',
      responding: 'investigating',
      investigating: 'resolved',
      resolved: 'closed',
      closed: 'archived',
      rejected: 'rejected',
      archived: 'archived'
    };

    return defaultProgressions[currentStatus] || currentStatus;
  }

  /**
   * Get all possible next statuses for current status and user role
   */
  static getAvailableTransitions(currentStatus: CaseStatus, userRole: string): CaseStatus[] {
    const possibleStatuses = VALID_STATUS_TRANSITIONS[currentStatus] || [];
    
    return possibleStatuses.filter(status => {
      const validation = this.validateTransition(currentStatus, status, userRole);
      return validation.isValid;
    });
  }

  /**
   * Get status transition timeline for a report
   */
  static getStatusTimeline(statusHistory: StatusHistoryEntry[]): Array<{
    status: CaseStatus;
    label: string;
    timestamp: Timestamp;
    officerId: string;
    officerRole?: string;
    notes: string;
    duration?: string;
  }> {
    if (!statusHistory || statusHistory.length === 0) {
      return [];
    }

    const sortedHistory = [...statusHistory].sort((a, b) => 
      a.timestamp.toMillis() - b.timestamp.toMillis()
    );

    return sortedHistory.map((entry, index) => {
      let duration: string | undefined;
      
      if (index > 0) {
        const prevEntry = sortedHistory[index - 1];
        const timeDiff = entry.timestamp.toMillis() - prevEntry.timestamp.toMillis();
        duration = this.formatDuration(timeDiff);
      }

      return {
        status: entry.status,
        label: CASE_STATUS_LABELS[entry.status],
        timestamp: entry.timestamp,
        officerId: entry.officerId,
        officerRole: entry.officerRole,
        notes: entry.notes,
        duration
      };
    });
  }

  /**
   * Format duration in a human-readable format
   */
  private static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Check if a report is overdue based on status and timestamps
   */
  static isReportOverdue(report: EnhancedCCRSReport): boolean {
    const now = Date.now();
    const reportTime = report.timestamp.toMillis();
    
    // Define SLA timeframes (in hours)
    const slaTimeframes: Record<CaseStatus, number> = {
      pending: 4,      // 4 hours for initial validation
      validated: 2,    // 2 hours for assignment
      assigned: 1,     // 1 hour for acceptance
      accepted: 2,     // 2 hours to start responding
      responding: 4,   // 4 hours to start investigation
      investigating: 48, // 48 hours for investigation
      resolved: 24,    // 24 hours for supervisor approval
      closed: 72,      // 72 hours for archiving
      rejected: Infinity,
      archived: Infinity
    };

    const slaHours = slaTimeframes[report.status];
    if (slaHours === Infinity) {
      return false; // No SLA for terminal states
    }

    const slaMilliseconds = slaHours * 60 * 60 * 1000;
    
    // Use the last status update time if available
    const lastStatusUpdate = report.statusHistory && report.statusHistory.length > 0
      ? Math.max(...report.statusHistory.map(h => h.timestamp.toMillis()))
      : reportTime;

    return (now - lastStatusUpdate) > slaMilliseconds;
  }

  /**
   * Get performance metrics for status transitions
   */
  static getPerformanceMetrics(reports: EnhancedCCRSReport[]) {
    const metrics = {
      averageResponseTime: 0,      // Time from assignment to acceptance (minutes)
      averageResolutionTime: 0,    // Time from acceptance to resolution (hours)
      overdueReports: 0,
      statusDistribution: {} as Record<CaseStatus, number>,
      transitionTimes: {} as Record<string, number[]>
    };

    reports.forEach(report => {
      // Count status distribution
      metrics.statusDistribution[report.status] = 
        (metrics.statusDistribution[report.status] || 0) + 1;

      // Count overdue reports
      if (this.isReportOverdue(report)) {
        metrics.overdueReports++;
      }

      // Calculate transition times
      const timeline = this.getStatusTimeline(report.statusHistory);
      for (let i = 1; i < timeline.length; i++) {
        const fromStatus = timeline[i - 1].status;
        const toStatus = timeline[i].status;
        const transitionKey = `${fromStatus}->${toStatus}`;
        const timeDiff = timeline[i].timestamp.toMillis() - timeline[i - 1].timestamp.toMillis();
        
        if (!metrics.transitionTimes[transitionKey]) {
          metrics.transitionTimes[transitionKey] = [];
        }
        metrics.transitionTimes[transitionKey].push(timeDiff);
      }
    });

    // Calculate averages
    const responseTransitions = metrics.transitionTimes['assigned->accepted'] || [];
    if (responseTransitions.length > 0) {
      metrics.averageResponseTime = Math.round(
        responseTransitions.reduce((a, b) => a + b, 0) / responseTransitions.length / (1000 * 60)
      );
    }

    const resolutionTransitions = metrics.transitionTimes['accepted->resolved'] || [];
    if (resolutionTransitions.length > 0) {
      metrics.averageResolutionTime = Math.round(
        resolutionTransitions.reduce((a, b) => a + b, 0) / resolutionTransitions.length / (1000 * 60 * 60)
      );
    }

    return metrics;
  }
}