import { ColorSchemeName } from 'react-native';

export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryDark: string;
  primaryLight: string;
  
  // Background colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  
  // Card/Surface colors
  card: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  
  // Border colors
  border: string;
  borderLight: string;
  
  // Status colors
  success: string;
  error: string;
  warning: string;
  info: string;
}

export const lightTheme: ThemeColors = {
  primary: '#059669',
  primaryDark: '#047857',
  primaryLight: '#10b981',
  
  background: '#ffffff',
  backgroundSecondary: '#f9fafb',
  backgroundTertiary: '#ecfdf5',
  
  card: '#ffffff',
  
  text: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

export const darkTheme: ThemeColors = {
  primary: '#10b981',
  primaryDark: '#059669',
  primaryLight: '#34d399',
  
  background: '#111827',
  backgroundSecondary: '#1f2937',
  backgroundTertiary: '#374151',
  
  card: '#1f2937',
  
  text: '#f9fafb',
  textSecondary: '#d1d5db',
  textTertiary: '#9ca3af',
  
  border: '#374151',
  borderLight: '#4b5563',
  
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

export const getTheme = (colorScheme: ColorSchemeName | null): ThemeColors => {
  return colorScheme === 'dark' ? darkTheme : lightTheme;
};

