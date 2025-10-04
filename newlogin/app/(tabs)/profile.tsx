import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeSwitcher } from '../../components/ui';
import { useAlert } from '../../contexts/AlertContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useStyles } from '../../styles/tabs/profile.styles';
import { useRoleCheck } from '../../components/auth/RoleGuard';

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const { showWarning, showError, showSuccess } = useAlert();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const { isActive, canAccessFeature } = useRoleCheck();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [areNotificationsEnabled, setAreNotificationsEnabled] = useState(true);
  const [isLocationEnabled, setIsLocationEnabled] = useState(true);

  useEffect(() => {
    if (user?.name) {
      setDisplayName(user.name);
    }
  }, [user?.name]);

  const handleSignOut = useCallback(async () => {
    showWarning(
      'Confirm Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/auth/login');
            } catch (error) {
              showError('Sign Out Failed', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  }, [logout, router, showError, showWarning]);

  const handleSaveProfile = useCallback(async () => {
    if (!displayName.trim()) {
      showError('Validation Error', 'Name cannot be empty.');
      return;
    }

    try {
      await updateProfile(displayName.trim());
      showSuccess('Success', 'Your profile has been updated.');
      setIsEditing(false);
    } catch (error) {
      showError('Update Failed', 'Could not update your profile. Please try again.');
    }
  }, [displayName, showError, showSuccess, updateProfile]);

  return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Profile</Text>
        </View>

        {/* User Info */}
        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.isAnonymous ? 'A' : user?.authMethod === 'phone' ? 'P' : 'E'}
              </Text>
            </View>
            {isEditing ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={styles.nameInput}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Enter your name"
                  placeholderTextColor={theme.colors.textSecondary}
                />
                <TouchableOpacity onPress={handleSaveProfile} style={styles.actionIcon}>
                  <Feather name="check" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.actionIcon}>
                  <Feather name="x" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.editContainer}>
                <Text style={styles.userName}>
                  {user?.isAnonymous
                    ? 'Anonymous User'
                    : user?.name || user?.email || user?.phoneNumber || 'User'}
                </Text>
                {!user?.isAnonymous && (
                  <TouchableOpacity 
                    onPress={() => {
                      setDisplayName(user?.name || '');
                      setIsEditing(true);
                    }}
                    style={styles.editButton}
                  >
                    <Feather name="edit-2" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
            <Text style={styles.userSubtitle}>
              {user?.isAnonymous
                ? 'Anonymous Account'
                : user?.authMethod === 'phone'
                ? 'Phone Verified Account'
                : 'Email Registered Account'}
            </Text>
          </View>

          {/* Account Details */}
          <View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Account Type</Text>
              <Text style={styles.detailValue}>
                {user?.isAnonymous ? 'Anonymous' : 'Registered'}
              </Text>
            </View>

            {!user?.isAnonymous && user?.email && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{user.email}</Text>
              </View>
            )}

            {!user?.isAnonymous && user?.phoneNumber && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{user.phoneNumber}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>User ID</Text>
              <Text style={styles.uid}>{user?.uid.slice(-8)}</Text>
            </View>

            {/* Role and Status Info (RBAC) */}
            {user?.role && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Role</Text>
                <Text style={styles.detailValue}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Text>
              </View>
            )}
            
            {user?.status && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={[
                  styles.detailValue,
                  { color: user.status === 'active' ? theme.colors.success : theme.colors.error }
                ]}>
                  {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Settings */}
        <View style={styles.card}>
          <Text style={styles.settingsHeader}>Settings</Text>

          <ThemeSwitcher />

          <View style={styles.settingsRow}>
            <Text style={styles.settingsRowText}>Push Notifications</Text>
            <Switch
              value={areNotificationsEnabled}
              onValueChange={setAreNotificationsEnabled}
            />
          </View>

          <View style={styles.settingsRow}>
            <Text style={styles.settingsRowText}>Location Services</Text>
            <Switch
              value={isLocationEnabled}
              onValueChange={setIsLocationEnabled}
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>

          {user?.isAnonymous && (
            <TouchableOpacity
              style={styles.createAccountButton}
              onPress={() => router.replace('/auth/register')}
            >
              <Text style={styles.createAccountButtonText}>Create Account</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.hotline}>Emergency Hotline: 911</Text>
          <Text style={styles.version}>Pangasinan Crime Report v1.0</Text>
          <Text style={styles.tagline}>Helping keep our community safe</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
