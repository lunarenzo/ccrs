import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { AuthCard, Button, GradientBackground, Input, PhoneInput } from '../../components/ui';
import { useAlertActions } from '../../contexts/AlertContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useStyles } from '../../styles/auth/login.styles';
import { formatError } from '../../utils/errorHandling';
import { userLoginSchema } from '../../utils/validation';

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'phone' | 'email'>('phone');
  const { signIn, signInAnonymous, sendOtp } = useAuth();
  const { showAuthError } = useAlertActions();
  const { theme } = useTheme();
  const styles = useStyles(theme);

  const handlePhoneLogin = async () => {
    if (!phoneNumber.trim()) {
      showAuthError('Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      await sendOtp(phoneNumber);
      router.push({
        pathname: '/auth/verify-otp',
        params: { phoneNumber },
      });
    } catch (error: any) {
      showAuthError(error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    try {
      setLoading(true);
      
      // Validate input
      const validatedData = userLoginSchema.parse({ email, password });
      
      await signIn(validatedData.email, validatedData.password);
      router.replace('/(tabs)');
    } catch (error: any) {
      showAuthError(formatError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    try {
      setLoading(true);
      await signInAnonymous();
      router.replace('/(tabs)');
    } catch (error: any) {
      showAuthError(error.message || 'Failed to sign in anonymously');
    } finally {
      setLoading(false);
    }
  };

  const navigateToRegister = () => {
    router.push('/auth/register');
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
              <Text style={styles.appTitle}>Pangasinan Crime Report</Text>
            </View>

            <AuthCard 
              title={authMode === 'phone' ? 'Verify Your Phone' : 'Welcome Back'} 
              subtitle={authMode === 'phone' 
                ? "We'll send you a verification code via SMS" 
                : "Sign in with your email and password"
              }
              showShield={false}
            >
              {authMode === 'phone' ? (
                <>
                  <PhoneInput
                    label="Phone Number"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="9XX XXX XXXX"
                  />

                  <Button
                    title={loading ? 'Sending Code...' : 'Send Verification Code'}
                    onPress={handlePhoneLogin}
                    disabled={loading || !phoneNumber.trim()}
                    loading={loading}
                    variant="primary"
                    style={{ marginBottom: theme.spacing.md }}
                  />
                  <View id="recaptcha-container"></View>
                </>
              ) : (
                <>
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
                    placeholder="Enter your password"
                    secureTextEntry
                    autoComplete="password"
                  />

                  <Button
                    title={loading ? 'Signing In...' : 'Sign In'}
                    onPress={handleEmailLogin}
                    disabled={loading}
                    loading={loading}
                    variant="primary"
                    style={{ marginBottom: theme.spacing.md }}
                  />
                </>
              )}

              <View style={styles.authToggle}>
                <TouchableOpacity 
                  onPress={() => setAuthMode(authMode === 'phone' ? 'email' : 'phone')}
                  disabled={loading}
                >
                  <Text style={styles.toggleText}>
                    {authMode === 'phone' 
                      ? 'Or login using email and password' 
                      : 'Or login using phone number'
                    }
                  </Text>
                </TouchableOpacity>
              </View>

              <Button
                title="Report Anonymously"
                onPress={handleAnonymousLogin}
                disabled={loading}
                variant="outline"
                style={{ marginBottom: theme.spacing.lg }}
              />

              <Button
                title="Don't have an account? Sign Up"
                onPress={navigateToRegister}
                disabled={loading}
                variant="ghost"
              />
            </AuthCard>

            <View style={styles.footer}>
              <Text style={styles.emergencyText}>
                Emergency Hotline: 911
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </GradientBackground>
  );
}

