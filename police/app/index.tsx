import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { AssignmentInboxScreen } from '../screens/AssignmentInboxScreen';
import { InviteActivationScreen } from '../screens/InviteActivationScreen';

export default function Index() {
  const { user, officer, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // If authenticated but not recognized as officer/supervisor yet, show invite activation
  if (isAuthenticated && !officer) return <InviteActivationScreen />;
  // Officers/supervisors go to inbox
  if (officer) return <AssignmentInboxScreen />;
  // Otherwise show login
  return <LoginScreen />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
});
