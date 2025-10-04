import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function EmergencyTriageScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const handleEmergencyCall = () => {
    Alert.alert(
      'Emergency Call',
      'You will be redirected to call 911 for immediate emergency response.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Call 911',
          style: 'destructive',
          onPress: () => {
            Linking.openURL('tel:911').catch((err) => {
              console.error('Failed to open phone app:', err);
              Alert.alert('Error', 'Unable to open phone app. Please dial 911 manually.');
            });
          },
        },
      ]
    );
  };

  const handleNonEmergency = () => {
    router.replace('/(tabs)?isEmergency=false');
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/auth/login');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Type</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>What type of report do you need to make?</Text>
          <Text style={styles.subtitle}>
            Please select the appropriate option based on the urgency of your situation.
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {/* Emergency Option */}
          <TouchableOpacity 
            style={[styles.optionButton, styles.emergencyButton]}
            onPress={handleEmergencyCall}
            activeOpacity={0.8}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons 
                name="warning" 
                size={32} 
                color={theme.colors.background} 
              />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={[styles.optionTitle, styles.emergencyTitle]}>
                EMERGENCY
              </Text>
              <Text style={[styles.optionDescription, styles.emergencyDescription]}>
                Life-threatening situations requiring immediate response
              </Text>
              <View style={styles.exampleContainer}>
                <Text style={[styles.exampleText, styles.emergencyExample]}>
                  • Crimes in progress
                </Text>
                <Text style={[styles.exampleText, styles.emergencyExample]}>
                  • Medical emergencies
                </Text>
                <Text style={[styles.exampleText, styles.emergencyExample]}>
                  • Fire or accidents
                </Text>
              </View>
            </View>
            <View style={styles.callIndicator}>
              <Ionicons name="call" size={20} color={theme.colors.background} />
            </View>
          </TouchableOpacity>

          {/* Non-Emergency Option */}
          <TouchableOpacity 
            style={[styles.optionButton, styles.nonEmergencyButton]}
            onPress={handleNonEmergency}
            activeOpacity={0.8}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons 
                name="document-text" 
                size={32} 
                color={theme.colors.primary} 
              />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={[styles.optionTitle, styles.nonEmergencyTitle]}>
                NON-EMERGENCY REPORT
              </Text>
              <Text style={[styles.optionDescription, styles.nonEmergencyDescription]}>
                File a report for incidents that are not life-threatening
              </Text>
              <View style={styles.exampleContainer}>
                <Text style={[styles.exampleText, styles.nonEmergencyExample]}>
                  • Past incidents to report
                </Text>
                <Text style={[styles.exampleText, styles.nonEmergencyExample]}>
                  • Property damage
                </Text>
                <Text style={[styles.exampleText, styles.nonEmergencyExample]}>
                  • General complaints
                </Text>
              </View>
            </View>
            <View style={styles.arrowIndicator}>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.infoText}>
              For emergencies, always call 911 first for immediate response.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.infoText}>
              Your safety is our priority. Non-emergency reports will be reviewed by officers.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  titleContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 20,
    marginBottom: 32,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emergencyButton: {
    backgroundColor: '#dc3545',
    borderWidth: 2,
    borderColor: '#dc3545',
  },
  nonEmergencyButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  optionIconContainer: {
    width: 50,
    alignItems: 'center',
  },
  optionTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emergencyTitle: {
    color: theme.colors.background,
  },
  nonEmergencyTitle: {
    color: theme.colors.primary,
  },
  optionDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  emergencyDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  nonEmergencyDescription: {
    color: theme.colors.textSecondary,
  },
  exampleContainer: {
    gap: 2,
  },
  exampleText: {
    fontSize: 12,
  },
  emergencyExample: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  nonEmergencyExample: {
    color: theme.colors.textSecondary,
  },
  callIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  arrowIndicator: {
    backgroundColor: 'rgba(49, 130, 206, 0.1)',
    borderRadius: 20,
    padding: 8,
  },
  infoContainer: {
    backgroundColor: theme.colors.cardBackground || '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});