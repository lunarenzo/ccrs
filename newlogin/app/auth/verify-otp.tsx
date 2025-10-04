import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { AuthCard, Button, GradientBackground, OTPInput } from '../../components/ui';
import { useAlertActions } from '../../contexts/AlertContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useStyles } from '../../styles/auth/verify-otp.styles';

export default function VerifyOTPScreen() {
  const { phoneNumber, isRegistration } = useLocalSearchParams<{
    phoneNumber: string;
    isRegistration?: string;
  }>();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const { confirmOtp, sendOtp } = useAuth();
  const { showVerificationSuccess, showAuthError, showCodeSentInfo } = useAlertActions();
  const { theme } = useTheme();
  const styles = useStyles(theme);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);


  const handleVerifyOTP = async (otp: string) => {
    setLoading(true);
    setError(undefined);

    try {
      await confirmOtp(otp);
      showVerificationSuccess();

      setTimeout(() => {
        if (isRegistration === 'true') {
          router.replace('/auth/register');
        } else {
          router.replace('/(tabs)');
        }
      }, 1500);
    } catch (err: any) {
      const errorMessage = err.message || 'Invalid verification code. Please try again.';
      setError(errorMessage);
      showAuthError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!phoneNumber) return;

    setLoading(true);
    try {
      await sendOtp(phoneNumber.replace('+63', ''));
      setCountdown(60);
      setCanResend(false);
      showCodeSentInfo();
    } catch (err: any) {
      showAuthError(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('63')) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
    }
    return phone;
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
              <Text style={styles.appTitle}>
                Pangasinan Crime Report
              </Text>
              <Text style={styles.tagline}>
                Secure • Anonymous • Fast
              </Text>
            </View>

            <AuthCard 
              title="Verify Your Phone" 
              subtitle={`We'll send you a verification code via SMS to ${formatPhoneNumber(phoneNumber || '')}`}
              showShield={true}
            >
              <OTPInput
                length={6}
                onComplete={handleVerifyOTP}
                error={error}
              />

              {loading && (
                <Button
                  title="Verifying..."
                  onPress={() => {}}
                  disabled={true}
                  loading={true}
                  variant="primary"
                  style={{ marginTop: theme.spacing.md }}
                />
              )}

              <View style={styles.resendContainer}>
                {canResend ? (
                  <TouchableOpacity onPress={handleResendCode}>
                    <Text style={styles.resendText}>
                      Resend Code
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.countdownText}>
                    Resend code in {countdown}s
                  </Text>
                )}
              </View>


              <Button
                title="Back to Phone Entry"
                onPress={() => router.back()}
                disabled={loading}
                variant="ghost"
                style={{ marginTop: theme.spacing.md }}
              />

              <View style={styles.privacyNote}>
                <Text style={styles.privacyText}>
                  Your number is kept private and secure.{"\n"}
                  You can report anonymously.
                </Text>
              </View>
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

