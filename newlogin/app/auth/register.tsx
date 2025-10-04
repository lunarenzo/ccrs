import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View
} from 'react-native';
import { AuthCard, Button, GradientBackground, Input } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useAlertActions } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { formatError } from '../../utils/errorHandling';
import { userRegistrationSchema } from '../../utils/validation';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { showAuthError } = useAlertActions();
  const { theme } = useTheme();

  const handleRegister = async () => {
    try {
      setLoading(true);
      
      // Validate input
      const validatedData = userRegistrationSchema.parse({ 
        email, 
        password, 
        name: name.trim() || undefined 
      });
      
      await signUp(validatedData.email, validatedData.password, validatedData.name);
      router.replace('/(tabs)');
    } catch (error: any) {
      showAuthError(formatError(error));
    } finally {
      setLoading(false);
    }
  };

  const navigateToLogin = () => {
    router.replace('/auth/login');
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.header}>
              <Text style={[styles.appTitle, { color: theme.colors.white }]}>Pangasinan Crime Report</Text>
            </View>

            <AuthCard 
              title="Create Account" 
              subtitle="Join the community to help make Pangasinan safer"
              showShield={false}
            >
              <Input
                label="Full Name (Optional)"
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                autoCapitalize="words"
                autoComplete="name"
              />

              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password (min 6 characters)"
                secureTextEntry
                autoComplete="password-new"
              />

              <Button
                title={loading ? 'Creating Account...' : 'Create Account'}
                onPress={handleRegister}
                disabled={loading}
                loading={loading}
                variant="primary"
                style={{ marginBottom: theme.spacing.lg }}
              />

              <Button
                title="Already have an account? Sign In"
                onPress={navigateToLogin}
                disabled={loading}
                variant="ghost"
              />
            </AuthCard>
            <View style={styles.footer}>
              <Text style={[styles.emergencyText, { color: theme.colors.white }]}>
                Emergency Hotline: 911
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </GradientBackground>
  );
}

const styles = {
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center' as const,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center' as const,
    marginBottom: 48,
    paddingHorizontal: 20,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center' as const,
    opacity: 0.9,
  },
  privacyNote: {
    marginTop: 24,
    alignItems: 'center' as const,
  },
  privacyText: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  disclaimer: {
    paddingHorizontal: 32,
    marginTop: 24,
  },
  disclaimerText: {
    fontSize: 12,
    textAlign: 'center' as const,
    lineHeight: 18,
    opacity: 0.8,
  },
  footer: {
    alignItems: 'center' as const,
    marginTop: 16,
  },
  emergencyText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
};
