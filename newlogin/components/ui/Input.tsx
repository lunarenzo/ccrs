import React from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
}

export function Input({
  label,
  error,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  ...textInputProps
}: InputProps) {
  const { theme } = useTheme();

  const inputStyles: TextStyle = {
    height: theme.components.input.height,
    paddingHorizontal: theme.components.input.padding,
    borderRadius: theme.components.input.borderRadius,
    borderWidth: 1,
    borderColor: error ? theme.colors.error : theme.colors.border,
    backgroundColor: theme.colors.inputBackground,
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.textPrimary,
  };

  const labelStyles: TextStyle = {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  };

  const errorStyles: TextStyle = {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  };

  return (
    <View style={[{ marginBottom: theme.spacing.md }, containerStyle]}>
      {label && (
        <Text style={[labelStyles, labelStyle]}>
          {label}
        </Text>
      )}
      <TextInput
        style={[inputStyles, inputStyle]}
        placeholderTextColor={theme.colors.textMuted}
        {...textInputProps}
      />
      {error && (
        <Text style={[errorStyles, errorStyle]}>
          {error}
        </Text>
      )}
    </View>
  );
}
