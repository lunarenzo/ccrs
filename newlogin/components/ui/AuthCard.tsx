import React, { ReactNode } from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from './Icon';
import { useStyles } from './AuthCard.styles';

interface AuthCardProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showShield?: boolean;
  style?: ViewStyle;
}

export function AuthCard({ children, title, subtitle, showShield = true, style }: AuthCardProps) {
  const { theme } = useTheme();
  const styles = useStyles(theme);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        {showShield && (
          <View style={styles.shieldIconContainer}>
            <Icon 
              name="shield-checkmark" 
              size={56} 
              color={theme.colors.white} 
              style={styles.shieldIcon}
            />
          </View>
        )}
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  );
}
