import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  error?: string;
  containerStyle?: ViewStyle;
}

export function OTPInput({ 
  length = 6, 
  onComplete, 
  error,
  containerStyle 
}: OTPInputProps) {
  const { theme } = useTheme();
  const [otp, setOtp] = useState(Array(length).fill(''));
  const inputRefs = useRef<TextInput[]>([]);

  const handleChangeText = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus next input
    if (text && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Call onComplete when all fields are filled
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === length) {
      onComplete(newOtp.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const containerStyles: ViewStyle = {
    marginBottom: theme.spacing.md,
  };

  const otpContainerStyles: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  };

  const inputStyles: TextStyle = {
    width: 45,
    height: 50,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: error ? theme.colors.error : theme.colors.border,
    backgroundColor: theme.colors.inputBackground,
    textAlign: 'center',
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  };

  const focusedInputStyles: TextStyle = {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.white,
  };

  const errorStyles: TextStyle = {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  };

  return (
    <View style={[containerStyles, containerStyle]}>
      <View style={otpContainerStyles}>
        {Array(length).fill(0).map((_, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              if (ref) inputRefs.current[index] = ref;
            }}
            style={[
              inputStyles,
              otp[index] && focusedInputStyles,
            ]}
            value={otp[index]}
            onChangeText={(text) => handleChangeText(text, index)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>
      {error && (
        <Text style={errorStyles}>
          {error}
        </Text>
      )}
    </View>
  );
}
