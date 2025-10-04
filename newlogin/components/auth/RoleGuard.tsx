import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { AuthUser } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles?: ('citizen' | 'officer' | 'supervisor' | 'admin')[];
  requireActiveStatus?: boolean;
  fallbackComponent?: ReactNode;
}

interface AccountStatusScreenProps {
  status: 'inactive' | 'suspended';
  onContactSupport?: () => void;
}

// Account Status Screen for suspended/inactive users
export function AccountStatusScreen({ status, onContactSupport }: AccountStatusScreenProps) {
  const getStatusInfo = () => {
    switch (status) {
      case 'suspended':
        return {
          icon: 'warning-outline' as const,
          title: 'Account Suspended',
          message: 'Your account has been temporarily suspended. Please contact support for assistance.',
          color: '#dc3545'
        };
      case 'inactive':
        return {
          icon: 'pause-circle-outline' as const,
          title: 'Account Inactive',
          message: 'Your account is currently inactive. Please contact an administrator to reactivate your account.',
          color: '#6c757d'
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

// Role Guard Component
export function RoleGuard({ 
  children, 
  allowedRoles = ['citizen'], 
  requireActiveStatus = true,
  fallbackComponent
}: RoleGuardProps) {
  const { user, loading } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Check if user is authenticated
  if (!user || user.isAnonymous) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }
    
    return (
      <View style={styles.statusContainer}>
        <View style={styles.statusContent}>
          <Ionicons name="log-in-outline" size={64} color="#007bff" style={styles.statusIcon} />
          <Text style={[styles.statusTitle, { color: '#007bff' }]}>Authentication Required</Text>
          <Text style={styles.statusMessage}>
            Please log in to access this feature.
          </Text>
        </View>
      </View>
    );
  }

  // Check account status (if required)
  if (requireActiveStatus && user.status && user.status !== 'active') {
    return <AccountStatusScreen status={user.status} />;
  }

  // Check role permissions
  if (user.role && !allowedRoles.includes(user.role)) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }
    
    return (
      <View style={styles.statusContainer}>
        <View style={styles.statusContent}>
          <Ionicons name="shield-outline" size={64} color="#dc3545" style={styles.statusIcon} />
          <Text style={[styles.statusTitle, { color: '#dc3545' }]}>Access Denied</Text>
          <Text style={styles.statusMessage}>
            You don't have permission to access this feature.
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
  const { user } = useAuth();

  const hasRole = (roles: ('citizen' | 'officer' | 'supervisor' | 'admin')[]): boolean => {
    if (!user || user.isAnonymous || !user.role) return false;
    return roles.includes(user.role);
  };

  const isActive = (): boolean => {
    return !!(user && user.status === 'active');
  };

  const canAccessFeature = (requiredRoles: ('citizen' | 'officer' | 'supervisor' | 'admin')[]): boolean => {
    return hasRole(requiredRoles) && isActive();
  };

  return {
    user,
    hasRole,
    isActive,
    canAccessFeature,
    isCitizen: () => hasRole(['citizen']),
    isOfficer: () => hasRole(['officer', 'supervisor']),
    isAdmin: () => hasRole(['admin'])
  };
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
    fontWeight: 'semibold',
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
