/**
 * Theme Configuration
 * Centralized theme configuration for the mobile app
 */

import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Soladia Brand Colors
export const colors = {
  // Primary Colors
  primary: '#E60012',
  primaryDark: '#B3000E',
  primaryLight: '#FF4757',
  
  // Secondary Colors
  secondary: '#0066CC',
  secondaryDark: '#004499',
  secondaryLight: '#3388DD',
  
  // Accent Colors
  accent: '#FFD700',
  accentDark: '#E6C200',
  accentLight: '#FFE033',
  
  // Semantic Colors
  success: '#00A650',
  warning: '#FF8C00',
  error: '#DC2626',
  info: '#0EA5E9',
  
  // Neutral Colors
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F8F9FA',
  gray100: '#F1F3F4',
  gray200: '#E8EAED',
  gray300: '#DADCE0',
  gray400: '#BDC1C6',
  gray500: '#9AA0A6',
  gray600: '#80868B',
  gray700: '#5F6368',
  gray800: '#3C4043',
  gray900: '#202124',
  
  // Background Colors
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceVariant: '#F8F9FA',
  
  // Text Colors
  onBackground: '#202124',
  onSurface: '#202124',
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  
  // Border Colors
  outline: '#DADCE0',
  outlineVariant: '#E8EAED',
  
  // Shadow Colors
  shadow: '#000000',
  elevation: '#000000',
};

// Dark Theme Colors
export const darkColors = {
  ...colors,
  background: '#0F0F0F',
  surface: '#1A1A1A',
  surfaceVariant: '#2A2A2A',
  onBackground: '#FFFFFF',
  onSurface: '#FFFFFF',
  outline: '#3C4043',
  outlineVariant: '#2A2A2A',
};

// Typography
export const typography = {
  // Font Families
  fontFamily: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semiBold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
    display: 'Poppins-Regular',
    displayMedium: 'Poppins-Medium',
    displaySemiBold: 'Poppins-SemiBold',
    displayBold: 'Poppins-Bold',
  },
  
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  
  // Line Heights
  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 32,
    '2xl': 36,
    '3xl': 40,
    '4xl': 44,
    '5xl': 56,
  },
  
  // Font Weights
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
    extraBold: '800',
    black: '900',
  },
};

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 80,
  '5xl': 96,
};

// Border Radius
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

// Shadows
export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Light Theme
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primaryLight,
    secondary: colors.secondary,
    secondaryContainer: colors.secondaryLight,
    tertiary: colors.accent,
    tertiaryContainer: colors.accentLight,
    surface: colors.surface,
    surfaceVariant: colors.surfaceVariant,
    background: colors.background,
    error: colors.error,
    onPrimary: colors.onPrimary,
    onSecondary: colors.onSecondary,
    onSurface: colors.onSurface,
    onBackground: colors.onBackground,
    outline: colors.outline,
    outlineVariant: colors.outlineVariant,
  },
  roundness: borderRadius.lg,
};

// Dark Theme
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primaryDark,
    secondary: colors.secondary,
    secondaryContainer: colors.secondaryDark,
    tertiary: colors.accent,
    tertiaryContainer: colors.accentDark,
    surface: darkColors.surface,
    surfaceVariant: darkColors.surfaceVariant,
    background: darkColors.background,
    error: colors.error,
    onPrimary: colors.onPrimary,
    onSecondary: colors.onSecondary,
    onSurface: darkColors.onSurface,
    onBackground: darkColors.onBackground,
    outline: darkColors.outline,
    outlineVariant: darkColors.outlineVariant,
  },
  roundness: borderRadius.lg,
};

// Default Theme
export const theme = lightTheme;

// Theme Utilities
export const getTheme = (isDark: boolean) => isDark ? darkTheme : lightTheme;

export const getColor = (colorName: keyof typeof colors, isDark: boolean = false) => {
  if (isDark && colorName in darkColors) {
    return darkColors[colorName as keyof typeof darkColors];
  }
  return colors[colorName];
};

export const getSpacing = (size: keyof typeof spacing) => spacing[size];

export const getBorderRadius = (size: keyof typeof borderRadius) => borderRadius[size];

export const getShadow = (size: keyof typeof shadows) => shadows[size];

export const getTypography = (variant: keyof typeof typography.fontSize) => ({
  fontSize: typography.fontSize[variant],
  lineHeight: typography.lineHeight[variant],
  fontFamily: typography.fontFamily.regular,
});

// Component Styles
export const componentStyles = {
  // Button Styles
  button: {
    primary: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    text: {
      color: colors.primary,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
    },
  },
  
  // Card Styles
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  
  // Input Styles
  input: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: typography.fontSize.base,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  
  // Container Styles
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Screen Styles
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
};
