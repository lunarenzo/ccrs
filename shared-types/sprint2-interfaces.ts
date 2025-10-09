/**
 * Sprint 2: Investigation & Approval Workflows - Enhanced TypeScript Interfaces
 * PNP Citizen Crime Reporting System (CCRS)
 * 
 * This file contains all the new TypeScript interfaces and types for Sprint 2 features:
 * - Crime Classification System
 * - IRF Auto-generation
 * - Enhanced Status Workflow
 * - Supervisor Approval Workflow
 * - Case Reassignment
 */

import type { Timestamp } from 'firebase/firestore';

// ============================================
// CORE ENUMS AND TYPES
// ============================================

// Enhanced status enum with Sprint 2 additions
export type CaseStatus = 
  | 'pending'           // Citizen submitted, awaiting desk officer validation
  | 'validated'         // Desk officer approved, awaiting assignment
  | 'assigned'          // Assigned to investigator, awaiting acceptance
  | 'accepted'          // Investigator accepted the case
  | 'declined'          // Investigator declined the case
  | 'responding'        // Investigator is responding to the scene
  | 'investigating'     // Active investigation in progress
  | 'resolved'          // Investigator marked case as resolved, awaiting supervisor approval
  | 'closed'            // Supervisor approved closure
  | 'rejected'          // Desk officer or investigator rejected
  | 'archived';         // Final archived state

export type ApprovalStatus = 'pending' | 'approved' | 'denied';
export type AssignmentStatus = 'pending' | 'accepted' | 'declined';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

// Crime classification types
export type CrimeClassificationType = 'rpc' | 'special_law';

// ============================================
// CRIME CLASSIFICATION INTERFACES
// ============================================

export interface CrimeCategory {
  id: string;
  code: string;                    // e.g., "Art. 248", "RA 9262"
  title: string;                   // e.g., "Murder", "Violence Against Women and Children"
  description: string;             // Detailed description of the crime
  category: CrimeClassificationType; // 'rpc' | 'special_law'
  penalty?: string;                // Penalty description
  elements?: string[];             // Elements of the crime
  isActive: boolean;               // For soft deletion
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;               // Admin/Supervisor who added it
}

// ============================================
// IRF (INCIDENT RECORD FORM) INTERFACES
// ============================================

// Field types for IRF template
export type IRFFieldType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'date' 
  | 'datetime' 
  | 'email' 
  | 'select' 
  | 'checkbox' 
  | 'signature';

// IRF Template field definition
export interface IRFTemplateField {
  name: string;                    // Field name/ID
  label: string;                   // Display label
  type: IRFFieldType;              // Field input type
  required?: boolean;              // Is field required
  mapFrom?: string;                // Path to source data (e.g., 'reporter.firstName')
  defaultValue?: string;           // Default value if no mapping
  options?: string[];              // For select fields
  autoGenerate?: boolean;          // Auto-generate value (e.g., IRF number)
  note?: string;                   // Additional field notes
}

// IRF Template section
export interface IRFTemplateSection {
  title: string;                   // Section title
  content?: string;                // Static content for the section
  fields: IRFTemplateField[];      // Fields in this section
}

// Complete IRF Template structure
export interface IRFTemplate {
  id: string;
  name: string;                    // e.g., "PNP Incident Record Form"
  version: string;                 // e.g., "1.0"
  description?: string;            // Template description
  isActive: boolean;               // Only one active template at a time
  sections: Record<string, IRFTemplateSection>; // Sections of the form
  requiredFields: string[];        // Fields that must be populated
  optionalFields?: string[];       // Optional fields
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;               // Admin who created/updated
}

// Generated IRF data instance
export interface IRFData {
  reportId: string;
  templateId: string;
  templateVersion: string;
  generatedBy: string;             // Desk officer who generated it
  generatedAt: Timestamp;
  pdfUrl?: string;                 // Firebase Storage URL
  pdfFilename?: string;
  populatedFields: Record<string, any>; // Field mappings from report data
  customFields?: Record<string, any>;   // Additional officer-entered data
  isFinalized: boolean;            // Whether the IRF is ready for submission
  irfEntryNumber?: string;         // Unique IRF number
  validationErrors?: ValidationError[]; // Field validation errors
}

// IRF field mapping configuration
export interface IRFFieldMapping {
  fieldName: string;
  sourcePath: string;              // Dot notation path to source data
  transformer?: (value: any) => any; // Optional value transformer
  defaultValue?: any;              // Fallback value
  isRequired: boolean;
}

// IRF generation request
export interface IRFGenerationRequest {
  reportId: string;
  templateId?: string;             // Optional, defaults to active template
  generatedBy: string;             // Officer generating the IRF
  customFields?: Record<string, any>; // Additional fields
  autoFinalize?: boolean;          // Automatically finalize after generation
}

// PDF generation configuration
export interface PDFGenerationConfig {
  pageSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  fonts?: Record<string, any>;
  watermark?: {
    text: string;
    opacity: number;
  };
  header?: {
    text: string;
    alignment?: 'left' | 'center' | 'right';
  };
  footer?: {
    text: string;
    alignment?: 'left' | 'center' | 'right';
  };
}

// ============================================
// STATUS HISTORY & WORKFLOW INTERFACES
// ============================================

export interface StatusHistoryEntry {
  id: string;
  status: CaseStatus;
  previousStatus?: CaseStatus;
  timestamp: Timestamp;
  officerId: string;
  officerName?: string;
  officerRole?: string;
  notes: string;                   // Required notes for each transition
  location?: {
    latitude: number;
    longitude: number;
  };
  metadata?: Record<string, any>;  // Additional context data
}

export interface WorkflowValidation {
  isValid: boolean;
  currentStatus: CaseStatus;
  targetStatus: CaseStatus;
  errorMessage?: string;
  requiredFields?: string[];
  requiredRole?: string;
}

// ============================================
// SUPERVISOR APPROVAL INTERFACES
// ============================================

export interface SupervisorApproval {
  required: boolean;
  status: ApprovalStatus;
  submittedBy?: string;            // Investigator who submitted for approval
  submittedAt?: Timestamp;
  remarks?: string;                // Supervisor's remarks
  approvedBy?: string;             // Supervisor who approved/denied
  approvedAt?: Timestamp;
  priority?: Priority;             // Priority assigned by supervisor
  estimatedResolution?: Timestamp; // Expected completion date
}

export interface ApprovalQueueItem {
  id: string;
  caseId: string;
  reportId: string;                // Reference to the main report
  submittedBy: string;             // Investigator UID
  submittedAt: Timestamp;
  priority: Priority;
  status: ApprovalStatus;
  caseTitle?: string;              // Brief case description
  location?: string;               // Incident location
  crimeCategory?: string;          // Crime classification
  urgencyReason?: string;          // Why this needs urgent approval
  investigatorNotes?: string;      // Notes from investigator
  supervisorRemarks?: string;      // Supervisor's decision remarks
  approvedBy?: string;             // Supervisor UID
  approvedAt?: Timestamp;
  estimatedWorkHours?: number;     // Investigation time estimate
}

// ============================================
// CASE REASSIGNMENT INTERFACES
// ============================================

export interface ReassignmentEntry {
  id: string;
  fromOfficerId: string;
  fromOfficerName?: string;
  toOfficerId: string;
  toOfficerName?: string;
  reassignedBy: string;            // Supervisor who performed reassignment
  reassignedAt: Timestamp;
  reason: string;                  // Required reason for reassignment
  notificationSent: boolean;       // Whether notifications were sent
  priority?: Priority;             // Updated priority if changed
  workloadJustification?: string;  // Workload balancing explanation
}

export interface CaseReassignment {
  reportId: string;
  currentOfficerId?: string;
  newOfficerId: string;
  reassignedBy: string;
  reason: string;
  priority?: Priority;
  estimatedCompletion?: Timestamp;
  notifyOfficers?: boolean;
}

// ============================================
// ENHANCED REPORT INTERFACE
// ============================================

export interface EnhancedCCRSReport {
  // Base fields from Sprint 1
  id: string;
  user_id?: string | null;
  status: CaseStatus;              // Enhanced status enum
  timestamp: Timestamp;
  updatedAt: Timestamp;
  
  // Core report fields
  mainCategory: string;
  category: string;
  description: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: {
      street?: string;
      district?: string;
      city?: string;
      region?: string;
      postalCode?: string;
      country?: string;
      formattedAddress?: string;
    };
    accuracy?: number;
  };
  media_urls?: string[];
  
  // Sprint 1 fields
  isEmergency?: boolean;
  triageLevel?: 'critical' | 'high' | 'medium' | 'low';
  triageNotes?: string;
  triageBy?: string;
  triageAt?: Timestamp;
  blotterNumber?: string;
  blotterCreatedAt?: Timestamp;
  blotterCreatedBy?: string;
  
  // Sprint 2: Crime Classification
  crimeCategory?: string;          // Reference to CrimeCategory.id
  crimeCode?: string;              // e.g., "Art. 248", "RA 9262"
  crimeTitle?: string;             // e.g., "Murder", "VAWC"
  classifiedBy?: string;           // Investigator who classified
  classifiedAt?: Timestamp;
  
  // Sprint 2: Status History & Workflow
  statusHistory: StatusHistoryEntry[];
  currentOfficerId?: string;       // Currently assigned officer
  
  // Sprint 2: IRF Generation
  irfGenerated: boolean;
  irfData?: IRFData;
  irfPdfUrl?: string;              // Direct link for quick access
  
  // Sprint 2: Supervisor Approval
  supervisorApproval?: SupervisorApproval;
  requiresSupervisorApproval: boolean;
  
  // Sprint 2: Reassignment History
  reassignmentHistory?: ReassignmentEntry[];
  reassignmentCount: number;       // Track number of reassignments
  
  // Investigation metadata
  investigationStartedAt?: Timestamp;
  investigationDuration?: number;  // In hours
  investigationNotes?: string;
  evidenceCount?: number;
  witnessCount?: number;
  
  // Performance metrics
  responseTime?: number;           // Time from assignment to acceptance (minutes)
  resolutionTime?: number;         // Time from acceptance to resolution (hours)
  
  // Additional Sprint 2 fields
  complexity?: 'simple' | 'moderate' | 'complex'; // Case complexity assessment
  followUpRequired?: boolean;      // Whether case needs follow-up
  relatedCases?: string[];         // IDs of related cases
}

// ============================================
// INVESTIGATOR DASHBOARD INTERFACES
// ============================================

export interface InvestigatorWorkload {
  officerId: string;
  officerName: string;
  activeCases: number;
  pendingCases: number;
  resolvedThisWeek: number;
  averageResolutionTime: number;  // In hours
  workloadScore: number;          // Calculated workload metric
  availability: 'available' | 'busy' | 'unavailable';
  lastActivity?: Timestamp;
}

export interface CaseQueueItem {
  id: string;
  reportId: string;
  title: string;
  priority: Priority;
  status: CaseStatus;
  assignedAt?: Timestamp;
  dueDate?: Timestamp;
  location?: string;
  crimeCategory?: string;
  triageLevel?: string;
  isOverdue: boolean;
  estimatedHours?: number;
}

// ============================================
// SUPERVISOR DASHBOARD INTERFACES
// ============================================

export interface SupervisorDashboardData {
  totalActiveCases: number;
  pendingApprovals: number;
  overdueInvestigations: number;
  avgResolutionTime: number;      // In hours
  officerWorkloads: InvestigatorWorkload[];
  recentActivity: StatusHistoryEntry[];
  performanceMetrics: {
    casesResolvedToday: number;
    casesResolvedThisWeek: number;
    casesResolvedThisMonth: number;
    averageResponseTime: number;  // Minutes
  };
}

// ============================================
// VALIDATION & ERROR INTERFACES
// ============================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// ============================================
// API RESPONSE INTERFACES
// ============================================

export interface CrimeClassificationResponse {
  categories: CrimeCategory[];
  totalCount: number;
  lastUpdated: Timestamp;
}

export interface IRFGenerationResponse {
  success: boolean;
  irfData?: IRFData;
  pdfUrl?: string;
  errors?: ValidationError[];
}

export interface ApprovalActionResponse {
  success: boolean;
  approvalId: string;
  newStatus: CaseStatus;
  message?: string;
  errors?: ValidationError[];
}

export interface ReassignmentResponse {
  success: boolean;
  reassignmentId: string;
  fromOfficer: string;
  toOfficer: string;
  notificationsSent: boolean;
  errors?: ValidationError[];
}

// ============================================
// HELPER TYPES FOR COMPONENTS
// ============================================

export interface CrimeSelectOption {
  value: string;
  label: string;
  code: string;
  category: CrimeClassificationType;
  description?: string;
}

export interface StatusTransitionOption {
  fromStatus: CaseStatus;
  toStatus: CaseStatus;
  label: string;
  requiresNotes: boolean;
  requiredRole: string[];
  icon?: string;
}

export interface WorkflowStep {
  step: number;
  status: CaseStatus;
  title: string;
  description: string;
  requiredRole: string[];
  estimatedDuration?: string;
  isCompleted: boolean;
  isCurrent: boolean;
  completedAt?: Timestamp;
  completedBy?: string;
}

// ============================================
// CONSTANTS AND DEFAULTS
// ============================================

export const DEFAULT_PRIORITY: Priority = 'medium';
export const DEFAULT_SUPERVISOR_APPROVAL: SupervisorApproval = {
  required: false,
  status: 'pending'
};

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  pending: 'Pending Validation',
  validated: 'Validated',
  assigned: 'Assigned to Investigator',
  accepted: 'Accepted by Investigator',
  declined: 'Declined by Investigator',
  responding: 'Responding to Scene',
  investigating: 'Under Investigation',
  resolved: 'Resolved (Pending Approval)',
  closed: 'Closed',
  rejected: 'Rejected',
  archived: 'Archived'
};

export const VALID_STATUS_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  pending: ['validated', 'rejected'],
  validated: ['assigned'],
  assigned: ['accepted', 'declined'],
  accepted: ['responding'],
  declined: ['assigned'], // Can be reassigned
  responding: ['investigating'],
  investigating: ['resolved', 'investigating'], // Can update within investigating
  resolved: ['closed', 'investigating'],        // Can reopen if needed
  closed: ['archived'],
  rejected: [],
  archived: []
};
