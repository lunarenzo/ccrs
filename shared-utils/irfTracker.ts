/**
 * IRF Tracking Utility
 * PNP Citizen Crime Reporting System (CCRS)
 * Sprint 2: IRF Auto-generation
 * 
 * Utility for comprehensive IRF tracking, audit trail, and history management.
 */

import { Timestamp } from 'firebase/firestore';
import type { 
  EnhancedCCRSReport,
  IRFData,
  StatusHistoryEntry
} from '../shared-types/sprint2-interfaces';

// IRF Generation History Entry
export interface IRFHistoryEntry {
  id: string;
  action: 'generated' | 'edited' | 'finalized' | 'uploaded' | 'downloaded';
  timestamp: Timestamp;
  officerId: string;
  officerName?: string;
  details?: Record<string, any>;
  metadata?: {
    templateId?: string;
    templateVersion?: string;
    pdfSize?: number;
    validationErrors?: number;
  };
}

// Complete IRF tracking data
export interface IRFTrackingData {
  reportId: string;
  isGenerated: boolean;
  generatedAt?: Timestamp;
  generatedBy?: string;
  
  // Current IRF Status
  currentIRFData?: {
    templateId: string;
    templateVersion: string;
    irfEntryNumber: string;
    isFinalized: boolean;
    pdfUrl?: string;
    pdfFilename?: string;
  };
  
  // History and audit trail
  history: IRFHistoryEntry[];
  
  // Metrics
  generationDuration?: number; // milliseconds
  editCount: number;
  downloadCount: number;
  lastAccessed?: Timestamp;
  
  // Related data
  relatedDocuments?: string[]; // Other document IDs
  
  // Status tracking
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Create initial IRF tracking data when generation starts
 * @param reportId - Report ID
 * @param officerId - Officer who initiated generation
 * @returns Initial tracking data
 */
export function createIRFTracking(
  reportId: string,
  _officerId: string
): IRFTrackingData {
  const now = Timestamp.now();
  
  return {
    reportId,
    isGenerated: false,
    history: [],
    editCount: 0,
    downloadCount: 0,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Add history entry to IRF tracking
 * @param tracking - Current tracking data
 * @param action - Action performed
 * @param officerId - Officer who performed the action
 * @param details - Additional details
 * @param metadata - Metadata about the action
 * @returns Updated tracking data
 */
export function addIRFHistoryEntry(
  tracking: IRFTrackingData,
  action: IRFHistoryEntry['action'],
  officerId: string,
  officerName?: string,
  details?: Record<string, any>,
  metadata?: IRFHistoryEntry['metadata']
): IRFTrackingData {
  const historyEntry: IRFHistoryEntry = {
    id: `${action}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    action,
    timestamp: Timestamp.now(),
    officerId,
    officerName,
    details,
    metadata
  };

  const updatedHistory = [...tracking.history, historyEntry];
  
  // Update counters based on action
  let editCount = tracking.editCount;
  let downloadCount = tracking.downloadCount;
  
  if (action === 'edited') {
    editCount++;
  } else if (action === 'downloaded') {
    downloadCount++;
  }

  return {
    ...tracking,
    history: updatedHistory,
    editCount,
    downloadCount,
    lastAccessed: Timestamp.now(),
    updatedAt: Timestamp.now()
  };
}

/**
 * Mark IRF as generated and finalized
 * @param tracking - Current tracking data
 * @param irfData - Generated IRF data
 * @param officerId - Officer who finalized
 * @param officerName - Officer name
 * @param generationStartTime - When generation started (for duration calculation)
 * @returns Updated tracking data
 */
export function markIRFGenerated(
  tracking: IRFTrackingData,
  irfData: IRFData,
  officerId: string,
  officerName?: string,
  generationStartTime?: Date
): IRFTrackingData {
  const now = Timestamp.now();
  const generationDuration = generationStartTime 
    ? now.toMillis() - generationStartTime.getTime()
    : undefined;

  // Add generation history entry
  const updatedTracking = addIRFHistoryEntry(
    tracking,
    'generated',
    officerId,
    officerName,
    {
      irfEntryNumber: irfData.irfEntryNumber,
      templateUsed: `${irfData.templateId} v${irfData.templateVersion}`,
      fieldsPopulated: Object.keys(irfData.populatedFields).length,
      hasValidationErrors: (irfData.validationErrors?.length || 0) > 0
    },
    {
      templateId: irfData.templateId,
      templateVersion: irfData.templateVersion,
      validationErrors: irfData.validationErrors?.length || 0
    }
  );

  return {
    ...updatedTracking,
    isGenerated: true,
    generatedAt: irfData.generatedAt,
    generatedBy: irfData.generatedBy,
    currentIRFData: {
      templateId: irfData.templateId,
      templateVersion: irfData.templateVersion,
      irfEntryNumber: irfData.irfEntryNumber || '',
      isFinalized: irfData.isFinalized,
      pdfUrl: irfData.pdfUrl,
      pdfFilename: irfData.pdfFilename
    },
    generationDuration,
    updatedAt: now
  };
}

/**
 * Update tracking when PDF is uploaded to Firebase Storage
 * @param tracking - Current tracking data
 * @param pdfUrl - PDF download URL
 * @param pdfFilename - PDF filename
 * @param pdfSize - PDF file size in bytes
 * @param officerId - Officer who uploaded
 * @returns Updated tracking data
 */
export function markPDFUploaded(
  tracking: IRFTrackingData,
  pdfUrl: string,
  pdfFilename: string,
  pdfSize: number,
  officerId: string,
  officerName?: string
): IRFTrackingData {
  const updatedTracking = addIRFHistoryEntry(
    tracking,
    'uploaded',
    officerId,
    officerName,
    {
      pdfUrl,
      pdfFilename,
      storageLocation: 'Firebase Storage'
    },
    {
      pdfSize
    }
  );

  return {
    ...updatedTracking,
    currentIRFData: tracking.currentIRFData ? {
      ...tracking.currentIRFData,
      pdfUrl,
      pdfFilename
    } : undefined
  };
}

/**
 * Track PDF download activity
 * @param tracking - Current tracking data
 * @param officerId - Officer who downloaded
 * @param downloadType - Type of download (view, download, print)
 * @returns Updated tracking data
 */
export function trackPDFDownload(
  tracking: IRFTrackingData,
  officerId: string,
  officerName?: string,
  downloadType: 'view' | 'download' | 'print' = 'download'
): IRFTrackingData {
  return addIRFHistoryEntry(
    tracking,
    'downloaded',
    officerId,
    officerName,
    {
      downloadType,
      pdfUrl: tracking.currentIRFData?.pdfUrl,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown'
    }
  );
}

/**
 * Get IRF generation metrics from tracking data
 * @param tracking - IRF tracking data
 * @returns Metrics object
 */
export function getIRFMetrics(tracking: IRFTrackingData): {
  isGenerated: boolean;
  generationDuration?: number;
  totalActions: number;
  editCount: number;
  downloadCount: number;
  daysSinceGeneration?: number;
  averageActionInterval?: number; // Average time between actions in hours
} {
  const metrics = {
    isGenerated: tracking.isGenerated,
    generationDuration: tracking.generationDuration,
    totalActions: tracking.history.length,
    editCount: tracking.editCount,
    downloadCount: tracking.downloadCount
  };

  // Calculate days since generation
  if (tracking.generatedAt) {
    const now = new Date();
    const generated = tracking.generatedAt.toDate();
    const daysSince = Math.floor((now.getTime() - generated.getTime()) / (1000 * 60 * 60 * 24));
    (metrics as any).daysSinceGeneration = daysSince;
  }

  // Calculate average action interval
  if (tracking.history.length > 1) {
    const firstAction = tracking.history[0].timestamp.toMillis();
    const lastAction = tracking.history[tracking.history.length - 1].timestamp.toMillis();
    const totalDuration = lastAction - firstAction;
    const averageInterval = totalDuration / (tracking.history.length - 1);
    (metrics as any).averageActionInterval = averageInterval / (1000 * 60 * 60); // Convert to hours
  }

  return metrics;
}

/**
 * Get recent IRF activity
 * @param tracking - IRF tracking data
 * @param limit - Number of recent entries to return
 * @returns Recent history entries
 */
export function getRecentIRFActivity(
  tracking: IRFTrackingData,
  limit: number = 5
): IRFHistoryEntry[] {
  return tracking.history
    .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())
    .slice(0, limit);
}

/**
 * Check if IRF is overdue for any action
 * @param tracking - IRF tracking data
 * @param maxIdleDays - Maximum days without activity before considering overdue
 * @returns Overdue status
 */
export function checkIRFOverdue(
  tracking: IRFTrackingData,
  maxIdleDays: number = 30
): {
  isOverdue: boolean;
  daysSinceLastActivity?: number;
  suggestedAction?: string;
} {
  if (tracking.history.length === 0) {
    return { isOverdue: false };
  }

  const lastActivity = tracking.history[tracking.history.length - 1];
  const now = new Date();
  const lastActivityDate = lastActivity.timestamp.toDate();
  const daysSince = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));

  const isOverdue = daysSince > maxIdleDays;
  
  let suggestedAction = '';
  if (isOverdue) {
    if (!tracking.isGenerated) {
      suggestedAction = 'Complete IRF generation';
    } else if (!tracking.currentIRFData?.isFinalized) {
      suggestedAction = 'Finalize IRF document';
    } else if (!tracking.currentIRFData?.pdfUrl) {
      suggestedAction = 'Upload PDF to storage';
    } else {
      suggestedAction = 'Review IRF status';
    }
  }

  return {
    isOverdue,
    daysSinceLastActivity: daysSince,
    suggestedAction: isOverdue ? suggestedAction : undefined
  };
}

/**
 * Generate IRF summary report
 * @param tracking - IRF tracking data
 * @returns Formatted summary
 */
export function generateIRFSummary(tracking: IRFTrackingData): {
  status: 'pending' | 'generated' | 'finalized' | 'complete';
  summary: string;
  details: Record<string, any>;
  recommendations: string[];
} {
  const metrics = getIRFMetrics(tracking);
  const overdueCheck = checkIRFOverdue(tracking);
  
  let status: 'pending' | 'generated' | 'finalized' | 'complete' = 'pending';
  let summary = '';
  const recommendations: string[] = [];

  if (!tracking.isGenerated) {
    status = 'pending';
    summary = 'IRF generation not yet started';
    recommendations.push('Initiate IRF generation process');
  } else if (!tracking.currentIRFData?.isFinalized) {
    status = 'generated';
    summary = 'IRF generated but not finalized';
    recommendations.push('Review and finalize IRF document');
  } else if (!tracking.currentIRFData?.pdfUrl) {
    status = 'finalized';
    summary = 'IRF finalized but not uploaded to storage';
    recommendations.push('Upload PDF to Firebase Storage');
  } else {
    status = 'complete';
    summary = 'IRF process complete';
  }

  // Add performance recommendations
  if (metrics.generationDuration && metrics.generationDuration > 300000) { // 5 minutes
    recommendations.push('Consider optimizing IRF generation process - took longer than expected');
  }

  if (overdueCheck.isOverdue) {
    recommendations.push(`Action overdue: ${overdueCheck.suggestedAction}`);
  }

  return {
    status,
    summary,
    details: {
      ...metrics,
      overdueStatus: overdueCheck,
      recentActivity: getRecentIRFActivity(tracking, 3)
    },
    recommendations
  };
}

// Export helper functions - removed conflicting exports since functions are already exported above
export { createIRFTracking as default };
