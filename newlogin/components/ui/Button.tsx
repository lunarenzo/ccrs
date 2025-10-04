import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const { theme } = useTheme();

  const getButtonStyles = (): ViewStyle => {
    let baseStyle: ViewStyle = {
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      minHeight: 44,
    };

    // Adjust for size
    if (size === 'sm') {
      baseStyle = {
        ...baseStyle,
        paddingHorizontal: 14,
        paddingVertical: 10,
        minHeight: 36,
      };
    } else if (size === 'lg') {
      baseStyle = {
        ...baseStyle,
        paddingHorizontal: 24,
        paddingVertical: 16,
        minHeight: 48,
      };
    }

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: disabled ? theme.colors.textMuted : theme.colors.primary,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: disabled ? theme.colors.textMuted : theme.colors.secondary,
          borderWidth: 1,
          borderColor: disabled ? theme.colors.textMuted : theme.colors.primary,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: disabled ? theme.colors.textMuted : theme.colors.primary,
        };
      case 'ghost':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyles = (): TextStyle => {
    let baseStyle: TextStyle = {
      fontSize: 15,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 20,
    };

    // Adjust for size
    if (size === 'sm') {
      baseStyle = {
        ...baseStyle,
        fontSize: 13,
        lineHeight: 18,
      };
    } else if (size === 'lg') {
      baseStyle = {
        ...baseStyle,
        fontSize: 16,
        lineHeight: 22,
      };
    }

    switch (variant) {
      case 'primary':
      case 'secondary':
        return {
          ...baseStyle,
          color: theme.colors.white,
        };
      case 'outline':
        return {
          ...baseStyle,
          color: disabled ? theme.colors.textMuted : theme.colors.primary,
        };
      case 'ghost':
        return {
          ...baseStyle,
          color: disabled ? theme.colors.textMuted : theme.colors.primary,
        };
      default:
        return baseStyle;
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyles(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? theme.colors.primary : theme.colors.white}
        />
      ) : (
        <Text style={[getTextStyles(), textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
