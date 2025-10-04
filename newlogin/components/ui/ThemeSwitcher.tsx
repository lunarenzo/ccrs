import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useStyles } from './ThemeSwitcher.styles';

export function ThemeSwitcher() {
  const { theme, themeType, setThemeType } = useTheme();
  const styles = useStyles(theme);

  const options = ['Light', 'Dark', 'System'];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Appearance</Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.option,
              themeType === option.toLowerCase() && styles.optionActive,
            ]}
            onPress={() => setThemeType(option.toLowerCase() as 'light' | 'dark' | 'system')}
          >
            <Text
              style={[
                styles.optionText,
                themeType === option.toLowerCase() && styles.optionTextActive,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
