import React, { createContext, useContext, ReactNode, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, GenericTheme } from '../constants/theme';

type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: GenericTheme;
  themeType: ThemeType;
  setThemeType: (themeType: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeType, setThemeType] = useState<ThemeType>('light');

  const theme = useMemo(() => {
    const isDarkMode =
      themeType === 'system' ? systemColorScheme === 'dark' : themeType === 'dark';
    return isDarkMode ? darkTheme : lightTheme;
  }, [themeType, systemColorScheme]);

  return (
    <ThemeContext.Provider value={{ theme, themeType, setThemeType }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
