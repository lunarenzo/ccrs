import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

interface IconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  color?: string;
  style?: any;
}

export function Icon({ name, size = 'md', color, style }: IconProps) {
  const { theme } = useTheme();

  const getIconSize = (size: IconProps['size']): number => {
    if (typeof size === 'number') return size;
    
    switch (size) {
      case 'sm':
        return 16;
      case 'md':
        return 24;
      case 'lg':
        return 32;
      case 'xl':
        return 40;
      default:
        return 24;
    }
  };

  return (
    <Ionicons
      name={name}
      size={getIconSize(size)}
      color={color || theme.colors.textPrimary}
      style={style}
    />
  );
}
