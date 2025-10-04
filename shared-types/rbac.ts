/**
 * Unified RBAC Types for CCRS System
 * Shared across citizen app (newlogin), police app, and admin dashboard
 */

// User Roles
export type UserRole = 'citizen' | 'officer' | 'supervisor' | 'admin' | 'desk_officer';

// User Status
export type UserStatus = 'active' | 'inactive' | 'suspended';

// Authentication Methods
export type AuthMethod = 'email' | 'phone' | 'anonymous';

// Base User Interface (unified across all apps)
export interface CCRSUser {
  id: string;
  email?: string | null;
  fullName?: string;
  phoneNumber?: string | null;
  role: UserRole;
  status: UserStatus;
  authMethod?: AuthMethod;
  isPhoneVerified?: boolean;
  
  // Officer/Supervisor specific fields
  jurisdictionId?: string;
  badgeNumber?: string;
  unit?: string;
  rank?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Additional metadata
  lastLoginAt?: Date;
  isOnline?: boolean;
}

// Role Permissions Map
export interface RolePermissions {
  canViewAllReports: boolean;
  canEditAllReports: boolean;
  canAssignReports: boolean;
  canManageUsers: boolean;
  canViewAuditLogs: boolean;
  canManageSystem: boolean;
  canAccessAdminDashboard: boolean;
  canAccessPoliceApp: boolean;
}

// Permission definitions by role
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  citizen: {
    canViewAllReports: false,
    canEditAllReports: false,
    canAssignReports: false,
    canManageUsers: false,
    canViewAuditLogs: false,
    canManageSystem: false,
    canAccessAdminDashboard: false,
    canAccessPoliceApp: false
  },
  officer: {
    canViewAllReports: false, // Only assigned reports
    canEditAllReports: false, // Only assigned reports
    canAssignReports: false,
    canManageUsers: false,
    canViewAuditLogs: false,
    canManageSystem: false,
    canAccessAdminDashboard: false,
    canAccessPoliceApp: true
  },
  supervisor: {
    canViewAllReports: true, // Within jurisdiction
    canEditAllReports: true, // Within jurisdiction
    canAssignReports: true, // Within jurisdiction
    canManageUsers: false, // Only officers in jurisdiction
    canViewAuditLogs: true,
    canManageSystem: false,
    canAccessAdminDashboard: false,
    canAccessPoliceApp: true
  },
  desk_officer: {
    canViewAllReports: false, // Only pending reports for validation
    canEditAllReports: false, // Only triage and validation actions
    canAssignReports: false,
    canManageUsers: false,
    canViewAuditLogs: false,
    canManageSystem: false,
    canAccessAdminDashboard: true, // Limited access to desk officer portal
    canAccessPoliceApp: false
  },
  admin: {
    canViewAllReports: true,
    canEditAllReports: true,
    canAssignReports: true,
    canManageUsers: true,
    canViewAuditLogs: true,
    canManageSystem: true,
    canAccessAdminDashboard: true,
    canAccessPoliceApp: true
  }
};

// Report Assignment Interface
export interface ReportAssignment {
  reportId: string;
  assignedOfficerId: string;
  assignedBySupervisorId: string;
  assignedAt: Date;
  acceptedAt?: Date;
  completedAt?: Date;
  notes?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedCompletionTime?: Date;
}

// Jurisdiction Interface
export interface Jurisdiction {
  id: string;
  name: string;
  type: 'precinct' | 'district' | 'city' | 'region';
  parentJurisdictionId?: string;
  supervisorId: string;
  officerIds: string[];
  coverageArea?: {
    coordinates: [number, number][];
    center: { lat: number; lng: number };
  };
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced Report Interface with RBAC fields
export interface CCRSReport {
  id: string;
  user_id?: string | null;
  mainCategory: 'crime' | 'child_abuse' | 'women_abuse' | 'other';
  category: string;
  description: string;
  media_urls?: string[];
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
  status: 'pending' | 'validated' | 'assigned' | 'investigating' | 'resolved' | 'rejected' | 'archived';
  
  // RBAC Assignment fields
  assignedOfficerId?: string;
  assignedAt?: Date;
  assignedBy?: string; // supervisor or admin ID
  jurisdictionId?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  
  // Tracking fields
  lastUpdatedBy?: string;
  statusHistory?: {
    status: string;
    updatedBy: string;
    updatedAt: Date;
    notes?: string;
  }[];
  
  // Existing fields
  timestamp: Date;
  updatedAt: Date;
  submission_type?: 'anonymous' | 'authenticated';
  media_count?: number;
  has_location?: boolean;
  comments?: {
    id: string;
    text: string;
    author: string;
    authorId: string;
    timestamp: Date;
    isInternal?: boolean; // For officer/supervisor notes
  }[];
}

// Audit Log Interface
export interface AuditLog {
  id: string;
  userId: string;
  userRole: UserRole;
  userEmail?: string;
  action: string;
  targetType: 'user' | 'report' | 'system';
  targetId?: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Firebase Custom Claims Interface
export interface CustomClaims {
  role: UserRole;
  status: UserStatus;
  jurisdictionId?: string;
}

// Route Protection Interface
export interface RouteProtection {
  requireAuth: boolean;
  allowedRoles?: UserRole[];
  requireActiveStatus?: boolean;
  redirectTo?: string;
}

// Helper type for checking permissions
export type PermissionCheck = (user: CCRSUser) => boolean;
