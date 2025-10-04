import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles?: ('officer' | 'supervisor')[];
  requireActiveStatus?: boolean;
  fallbackComponent?: ReactNode;
}

interface AccountStatusScreenProps {
  status: 'inactive' | 'suspended' | 'unauthorized';
  onContactSupport?: () => void;
}

// Account Status Screen for suspended/inactive/unauthorized users
export function AccountStatusScreen({ status, onContactSupport }: AccountStatusScreenProps) {
  const getStatusInfo = () => {
    switch (status) {
      case 'suspended':
        return {
          icon: 'warning-outline' as const,
          title: 'Account Suspended',
          message: 'Your officer account has been temporarily suspended. Please contact your supervisor or IT department.',
          color: '#dc3545'
        };
      case 'inactive':
        return {
          icon: 'pause-circle-outline' as const,
          title: 'Account Inactive',
          message: 'Your officer account is currently inactive. Please contact your supervisor to reactivate your account.',
          color: '#6c757d'
        };
      case 'unauthorized':
        return {
          icon: 'shield-outline' as const,
          title: 'Access Restricted',
          message: 'This app is restricted to authorized law enforcement personnel only.',
          color: '#dc3545'
        };
      default:
        return {
          icon: 'alert-circle-outline' as const,
          title: 'Account Issue',
          message: 'There is an issue with your account status.',
          color: '#ffc107'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <View style={styles.statusContainer}>
      <View style={styles.statusContent}>
        <Ionicons 
          name={statusInfo.icon} 
          size={64} 
          color={statusInfo.color} 
          style={styles.statusIcon} 
        />
        
        <Text style={[styles.statusTitle, { color: statusInfo.color }]}>
          {statusInfo.title}
        </Text>
        
        <Text style={styles.statusMessage}>
          {statusInfo.message}
        </Text>
        
        {onContactSupport && (
          <TouchableOpacity 
            style={[styles.supportButton, { backgroundColor: statusInfo.color }]}
            onPress={onContactSupport}
          >
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// Role Guard Component for Police App
export function RoleGuard({ 
  children, 
  allowedRoles = ['officer', 'supervisor'], 
  requireActiveStatus = true,
  fallbackComponent
}: RoleGuardProps) {
  const { officer, loading, isAuthenticated } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Authenticating...</Text>
      </View>
    );
  }

  // Check if user is authenticated and has officer role
  if (!isAuthenticated || !officer) {
    return <AccountStatusScreen status="unauthorized" />;
  }

  // Check role permissions
  if (!allowedRoles.includes(officer.role)) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }
    
    return (
      <View style={styles.statusContainer}>
        <View style={styles.statusContent}>
          <Ionicons name="shield-outline" size={64} color="#dc3545" style={styles.statusIcon} />
          <Text style={[styles.statusTitle, { color: '#dc3545' }]}>Insufficient Privileges</Text>
          <Text style={styles.statusMessage}>
            You don&apos;t have the required privileges to access this feature. 
            Contact your supervisor if you believe this is an error.
          </Text>
        </View>
      </View>
    );
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
  const { officer, isAuthenticated } = useAuth();

  const hasRole = (roles: ('officer' | 'supervisor')[]): boolean => {
    if (!isAuthenticated || !officer) return false;
    return roles.includes(officer.role);
  };

  const canAccessFeature = (requiredRoles: ('officer' | 'supervisor')[]): boolean => {
    return hasRole(requiredRoles) && isAuthenticated;
  };

  return {
    officer,
    isAuthenticated,
    hasRole,
    canAccessFeature,
    isOfficer: () => hasRole(['officer']),
    isSupervisor: () => hasRole(['supervisor']),
    canManageReports: () => hasRole(['supervisor']),
    canAssignReports: () => hasRole(['supervisor'])
  };
}

// Component to show content only for supervisors
export function SupervisorOnly({ children }: { children: ReactNode }) {
  const { isSupervisor } = useRoleCheck();
  
  if (!isSupervisor()) {
    return null;
  }
  
  return <>{children}</>;
}

// Component to show content only for officers
export function OfficerOnly({ children }: { children: ReactNode }) {
  const { isOfficer } = useRoleCheck();
  
  if (!isOfficer()) {
    return null;
  }
  
  return <>{children}</>;
}

const styles = StyleSheet.create({
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 24,
  },
  statusContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  statusIcon: {
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  statusMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  supportButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  supportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
  },
});
