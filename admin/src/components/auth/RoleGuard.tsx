import React, { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Warning, Prohibit, Clock } from 'phosphor-react';
import { type UserRole } from '../../services/rbacService';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requireActiveStatus?: boolean;
  redirectTo?: string;
  fallbackComponent?: ReactNode;
}

interface AccountStatusProps {
  status: 'inactive' | 'suspended';
  userRole?: string;
}

// Account Status Screen for suspended/inactive users
export function AccountStatusScreen({ status, userRole }: AccountStatusProps) {
  const getStatusInfo = () => {
    switch (status) {
      case 'suspended':
        return {
          icon: Warning,
          title: 'Account Suspended',
          message: `Your ${userRole || 'account'} has been temporarily suspended. Please contact the system administrator for assistance.`,
          variant: 'danger' as const
        };
      case 'inactive':
        return {
          icon: Clock,
          title: 'Account Inactive',
          message: `Your ${userRole || 'account'} is currently inactive. Please contact the system administrator to reactivate your account.`,
          variant: 'warning' as const
        };
      default:
        return {
          icon: Prohibit,
          title: 'Account Issue',
          message: 'There is an issue with your account status.',
          variant: 'warning' as const
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100">
      <div className="text-center" style={{ maxWidth: '400px' }}>
        <Alert variant={statusInfo.variant} className="p-4">
          <div className="mb-3">
            <StatusIcon size={64} />
          </div>
          <Alert.Heading>{statusInfo.title}</Alert.Heading>
          <p className="mb-0">{statusInfo.message}</p>
        </Alert>
      </div>
    </div>
  );
}

// Access Denied Screen
export function AccessDeniedScreen({ userRole }: { userRole?: string }) {
  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100">
      <div className="text-center" style={{ maxWidth: '400px' }}>
        <Alert variant="danger" className="p-4">
          <div className="mb-3">
            <Shield size={64} />
          </div>
          <Alert.Heading>Access Denied</Alert.Heading>
          <p className="mb-0">
            You don't have sufficient privileges to access this area. 
            {userRole && ` Your current role: ${userRole}`}
          </p>
        </Alert>
      </div>
    </div>
  );
}

// Role Guard Component
export function RoleGuard({ 
  children, 
  allowedRoles = ['admin'], 
  requireActiveStatus = true,
  redirectTo = '/login',
  fallbackComponent
}: RoleGuardProps) {
  const { user, isAuthenticated, loading } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <div className="mt-2">Loading...</div>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check account status (if required)
  if (requireActiveStatus && user.status !== 'active') {
    return <AccountStatusScreen status={user.status} userRole={user.role} />;
  }

  // Check role permissions
  if (!allowedRoles.includes(user.role)) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }
    
    return <AccessDeniedScreen userRole={user.role} />;
  }

  return <>{children}</>;
}

// Higher-order component for route protection
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardProps: Omit<RoleGuardProps, 'children'>
) {
  return function GuardedComponent(props: P) {
    return (
      <RoleGuard {...guardProps}>
        <Component {...props} />
      </RoleGuard>
    );
  };
}

// Hook for conditional rendering based on roles
export function useRoleCheck() {
  const { user, isAuthenticated, isAdmin, isSupervisor, hasRole, hasPermission } = useAuth();

  const canAccessFeature = (requiredRoles: ('admin' | 'supervisor')[]): boolean => {
    return hasRole(requiredRoles) && user?.status === 'active';
  };

  const canManageUsers = (): boolean => {
    return hasPermission('manage_users') && user?.status === 'active';
  };

  const canViewAuditLogs = (): boolean => {
    return hasPermission('view_audit_logs') && user?.status === 'active';
  };

  const canManageSystem = (): boolean => {
    return hasPermission('manage_system') && user?.status === 'active';
  };

  return {
    user,
    isAuthenticated,
    isAdmin,
    isSupervisor,
    hasRole,
    hasPermission,
    canAccessFeature,
    canManageUsers,
    canViewAuditLogs,
    canManageSystem,
    isActive: user?.status === 'active'
  };
}

// Component to show content only for admins
export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const { isAdmin, isActive } = useRoleCheck();
  
  if (!isAdmin || !isActive) {
    return fallback ? <>{fallback}</> : null;
  }
  
  return <>{children}</>;
}

// Component to show content only for supervisors (and admins)
export function SupervisorOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const { isSupervisor, isActive } = useRoleCheck();
  
  if (!isSupervisor || !isActive) {
    return fallback ? <>{fallback}</> : null;
  }
  
  return <>{children}</>;
}

// Component to show content based on permissions
export function PermissionGuard({ 
  permission, 
  children, 
  fallback 
}: { 
  permission: string; 
  children: ReactNode; 
  fallback?: ReactNode;
}) {
  const { hasPermission, isActive } = useRoleCheck();
  
  if (!hasPermission(permission) || !isActive) {
    return fallback ? <>{fallback}</> : null;
  }
  
  return <>{children}</>;
}

// Protected Route Component (for use with React Router)
export function ProtectedRoute({ 
  children,
  allowedRoles = ['admin'],
  requireActiveStatus = true,
  redirectTo = '/login'
}: {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requireActiveStatus?: boolean;
  redirectTo?: string;
}) {
  return (
    <RoleGuard 
      allowedRoles={allowedRoles}
      requireActiveStatus={requireActiveStatus}
      redirectTo={redirectTo}
    >
      {children}
    </RoleGuard>
  );
}
