import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { 
  RoleGuard, 
  SupervisorOnly, 
  OfficerOnly, 
  useRoleCheck,
  AccountStatusScreen 
} from '../components/auth/RoleGuard';

/**
 * Example Screen demonstrating Role-Based Access Control usage
 * This shows how to implement different UI elements based on user roles
 */
export default function ExampleRoleUsageScreen() {
  const { 
    officer, 
    isAuthenticated, 
    isSupervisor, 
    isOfficer, 
    canManageReports, 
    canAssignReports 
  } = useRoleCheck();

  // Check if user is not authenticated
  if (!isAuthenticated || !officer) {
    return <AccountStatusScreen status="unauthorized" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Header with role information */}
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>Officer Dashboard</Text>
          <Text style={styles.roleInfo}>
            Role: {officer.role === 'supervisor' ? 'Supervisor' : 'Officer'}
          </Text>
          <Text style={styles.uidInfo}>
            Badge: {officer.uid.slice(-8).toUpperCase()}
          </Text>
        </View>

        {/* Basic features available to all law enforcement */}
        <RoleGuard allowedRoles={['officer', 'supervisor']}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Assigned Cases</Text>
            <Text style={styles.cardDescription}>
              View and manage cases assigned to you
            </Text>
            <TouchableOpacity style={styles.button}>
              <Ionicons name="folder-outline" size={20} color="white" />
              <Text style={styles.buttonText}>View My Cases</Text>
            </TouchableOpacity>
          </View>
        </RoleGuard>

        {/* Officer-only features */}
        <OfficerOnly>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Officer Tools</Text>
            <Text style={styles.cardDescription}>
              Tools available for field officers
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
                <Ionicons name="camera-outline" size={20} color="#007bff" />
                <Text style={[styles.buttonText, { color: '#007bff' }]}>Take Evidence Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
                <Ionicons name="location-outline" size={20} color="#007bff" />
                <Text style={[styles.buttonText, { color: '#007bff' }]}>Update Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        </OfficerOnly>

        {/* Supervisor-only features */}
        <SupervisorOnly>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Supervisor Controls</Text>
            <Text style={styles.cardDescription}>
              Administrative functions for supervisors
            </Text>
            <View style={styles.buttonColumn}>
              <TouchableOpacity style={[styles.button, styles.supervisorButton]}>
                <Ionicons name="people-outline" size={20} color="white" />
                <Text style={styles.buttonText}>Manage Officers</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.supervisorButton]}>
                <Ionicons name="clipboard-outline" size={20} color="white" />
                <Text style={styles.buttonText}>Assign Cases</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.supervisorButton]}>
                <Ionicons name="stats-chart-outline" size={20} color="white" />
                <Text style={styles.buttonText}>View Statistics</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SupervisorOnly>

        {/* Conditional rendering using hooks */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Available Actions</Text>
          
          {/* Show different content based on role */}
          {isOfficer() && (
            <View style={styles.infoBox}>
              <Ionicons name="shield-outline" size={24} color="#28a745" />
              <Text style={styles.infoText}>
                You have officer privileges. You can view and update your assigned cases.
              </Text>
            </View>
          )}
          
          {isSupervisor() && (
            <View style={styles.infoBox}>
              <Ionicons name="star-outline" size={24} color="#ffc107" />
              <Text style={styles.infoText}>
                You have supervisor privileges. You can manage officers and assign cases.
              </Text>
            </View>
          )}

          {/* Show features based on permissions */}
          {canManageReports() && (
            <View style={styles.permissionItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#28a745" />
              <Text style={styles.permissionText}>Can manage all reports in jurisdiction</Text>
            </View>
          )}
          
          {canAssignReports() && (
            <View style={styles.permissionItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#28a745" />
              <Text style={styles.permissionText}>Can assign reports to officers</Text>
            </View>
          )}
        </View>

        {/* Example of nested role guards */}
        <RoleGuard allowedRoles={['supervisor']} 
          fallbackComponent={
            <View style={styles.restrictedCard}>
              <Ionicons name="lock-closed-outline" size={32} color="#6c757d" />
              <Text style={styles.restrictedText}>
                Supervisor access required for advanced settings
              </Text>
            </View>
          }
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Advanced Settings</Text>
            <Text style={styles.cardDescription}>
              Configuration options for supervisors
            </Text>
            <TouchableOpacity style={[styles.button, styles.dangerButton]}>
              <Ionicons name="settings-outline" size={20} color="white" />
              <Text style={styles.buttonText}>System Settings</Text>
            </TouchableOpacity>
          </View>
        </RoleGuard>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    backgroundColor: '#007bff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  roleInfo: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  uidInfo: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonColumn: {
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007bff',
  },
  supervisorButton: {
    backgroundColor: '#6f42c1',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#333',
  },
  restrictedCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  restrictedText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
  },
});
