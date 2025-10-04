// Design System Theme Configuration

const lightColors = {
  primary: '#2B4C8C',
  secondary: '#4674e5',
  accent: '#98c3f0',
  highlight: '#d6ac27',
  background: '#f8fafc', // Changed for better contrast
  card: '#ffffff',
  gradientStart: '#1E3A8A',
  gradientEnd: '#3B82F6',
  white: '#ffffff',
  black: '#000000',
  text: '#1f2937',
  textPrimary: '#1f2937',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  textMuted: '#718096',
  textOnPrimary: '#ffffff',
  success: '#10b981',
  danger: '#ef4444',
  dangerLight: '#fee2e2',
  warning: '#ed8936',
  error: '#f56565',
  info: '#4299e1',
  border: '#d1d5db', // Darkened for visibility
  borderFocus: '#4674e5',
  inputBackground: '#ffffff', // Changed to white
  cardBackground: '#ffffff',
  overlay: 'rgba(0, 0, 0, 0.5)',
  gray: '#d1d5db',
  lightGray: '#f3f4f6',
} as const;

const darkColors = {
  primary: '#60a5fa', // Desaturated blue
  secondary: '#818cf8', // Desaturated indigo
  accent: '#93c5fd', // Desaturated lighter blue
  highlight: '#facc15', // Desaturated yellow
  background: '#111827', // Dark gray (not pure black)
  card: '#1f2937', // Lighter gray for elevation
  gradientStart: '#1E3A8A',
  gradientEnd: '#2563EB',
  white: '#f9fafb', // Off-white
  black: '#111827', // Same as background
  text: '#f9fafb', // Off-white
  textPrimary: '#f9fafb', // Off-white
  textSecondary: '#9ca3af', // Muted gray
  textTertiary: '#6b7280', // More muted gray
  textMuted: '#4b5563',
  textOnPrimary: '#f9fafb', // Off-white
  success: '#4ade80', // Desaturated green
  danger: '#f87171', // Desaturated red
  dangerLight: '#3f2121',
  warning: '#fbbf24', // Desaturated amber
  error: '#f87171', // Same as danger
  info: '#60a5fa', // Same as primary
  border: '#374151', // Muted border
  borderFocus: '#60a5fa',
  inputBackground: '#374151',
  cardBackground: '#1f2937',
  overlay: 'rgba(0, 0, 0, 0.7)',
  gray: '#4b5563',
  lightGray: '#374151',
} as const;

const baseTheme = {
  typography: {
    fontFamily: { regular: 'System', medium: 'System', bold: 'System' },
    fontSize: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28, '4xl': 32 },
    fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
    lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.75 },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48, '3xl': 64 },
  borderRadius: { none: 0, sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
  shadows: {
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5 },
    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 8 },
  },
  components: {
    button: {
      height: { sm: 36, md: 44, lg: 52 },
      padding: {
        sm: { paddingHorizontal: 16, paddingVertical: 8 },
        md: { paddingHorizontal: 24, paddingVertical: 16 },
        lg: { paddingHorizontal: 32, paddingVertical: 24 },
      },
    },
    input: { height: 44, padding: 16, borderRadius: 8 },
    card: { padding: 24, borderRadius: 12 },
  },
} as const;

export const lightTheme = {
  ...baseTheme,
  colors: lightColors,
} as const;

export const darkTheme = {
  ...baseTheme,
  colors: darkColors,
} as const;

export type Theme = typeof lightTheme;

// A more generic type for colors to avoid literal type conflicts
export type ColorPalette = { [K in keyof typeof lightColors]: string };

// A generic theme type that can accommodate both light and dark themes
export type GenericTheme = Omit<Theme, 'colors'> & { colors: ColorPalette };
