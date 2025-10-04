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
import { Icon } from './Icon';

interface PhoneInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  label?: string;
  error?: string;
  value: string;
  onChangeText: (text: string) => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
}

export function PhoneInput({
  label,
  error,
  value,
  onChangeText,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  ...textInputProps
}: PhoneInputProps) {
  const { theme } = useTheme();

  const containerStyles: ViewStyle = {
    marginBottom: theme.spacing.md,
  };

  const labelStyles: TextStyle = {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  };

  const inputContainerStyles: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    height: theme.components.input.height,
    borderRadius: theme.components.input.borderRadius,
    borderWidth: 1,
    borderColor: error ? theme.colors.error : theme.colors.border,
    backgroundColor: theme.colors.inputBackground,
    paddingHorizontal: theme.components.input.padding,
  };

  const prefixStyles: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
    paddingRight: theme.spacing.sm,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
  };

  const inputStyles: TextStyle = {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.textPrimary,
  };

  const errorStyles: TextStyle = {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  };

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digits
    const digits = text.replace(/\D/g, '');
    
    // Format as Philippine mobile number
    if (digits.length <= 4) {
      return digits;
    } else if (digits.length <= 7) {
      return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    } else if (digits.length <= 11) {
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
    
    // Limit to 11 digits for Philippine numbers
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
  };

  const handleTextChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    onChangeText(formatted);
  };

  return (
    <View style={[containerStyles, containerStyle]}>
      {label && (
        <Text style={[labelStyles, labelStyle]}>
          {label}
        </Text>
      )}
      <View style={inputContainerStyles}>
        <View style={prefixStyles}>
          <Icon name="call" size="sm" color={theme.colors.textMuted} />
          <Text style={{ color: theme.colors.textSecondary, marginLeft: theme.spacing.xs }}>
            +63
          </Text>
        </View>
        <TextInput
          style={[inputStyles, inputStyle]}
          value={value}
          onChangeText={handleTextChange}
          placeholder="9XX XXX XXXX"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="phone-pad"
          maxLength={13} // Formatted length
          {...textInputProps}
        />
      </View>
      {error && (
        <Text style={[errorStyles, errorStyle]}>
          {error}
        </Text>
      )}
    </View>
  );
}
