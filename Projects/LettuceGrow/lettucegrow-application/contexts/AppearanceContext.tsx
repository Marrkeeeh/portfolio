import { getTheme, ThemeColors } from '@/constants/theme';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { AppearanceMode, getAppearanceMode, saveAppearanceMode } from '../utils/appearanceStorage';

/**
 * Appearance Context
 * Manages theme/appearance state and provides appearance-related functions
 */

interface AppearanceContextType {
  appearanceMode: AppearanceMode;
  colorScheme: ColorSchemeName;
  theme: ThemeColors;
  setAppearanceMode: (mode: AppearanceMode) => Promise<void>;
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

export const AppearanceProvider = ({ children }: { children: ReactNode }) => {
  const [appearanceMode, setAppearanceModeState] = useState<AppearanceMode>('system');
  const [colorScheme, setColorScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());
  const [theme, setTheme] = useState<ThemeColors>(getTheme(Appearance.getColorScheme()));

  // Load appearance mode from storage on mount
  useEffect(() => {
    loadStoredAppearance();
  }, []);

  // Update theme when colorScheme changes
  useEffect(() => {
    setTheme(getTheme(colorScheme));
  }, [colorScheme]);

  // Listen to system appearance changes when mode is 'system'
  useEffect(() => {
    if (appearanceMode === 'system') {
      const subscription = Appearance.addChangeListener(({ colorScheme: newColorScheme }) => {
        setColorScheme(newColorScheme);
      });

      return () => subscription.remove();
    } else {
      setColorScheme(appearanceMode);
    }
  }, [appearanceMode]);

  /**
   * Load stored appearance mode
   */
  const loadStoredAppearance = async () => {
    try {
      const storedMode = await getAppearanceMode();
      if (storedMode) {
        setAppearanceModeState(storedMode);
        const initialColorScheme = storedMode === 'system' 
          ? Appearance.getColorScheme() 
          : storedMode;
        setColorScheme(initialColorScheme);
        setTheme(getTheme(initialColorScheme));
      } else {
        // Default to system if nothing stored
        const initialColorScheme = Appearance.getColorScheme();
        setAppearanceModeState('system');
        setColorScheme(initialColorScheme);
        setTheme(getTheme(initialColorScheme));
      }
    } catch (error) {
      console.error('❌ Failed to load appearance mode:', error);
      const initialColorScheme = Appearance.getColorScheme();
      setAppearanceModeState('system');
      setColorScheme(initialColorScheme);
      setTheme(getTheme(initialColorScheme));
    }
  };

  /**
   * Set appearance mode
   */
  const setAppearanceMode = async (mode: AppearanceMode) => {
    try {
      await saveAppearanceMode(mode);
      setAppearanceModeState(mode);
      const newColorScheme = mode === 'system' 
        ? Appearance.getColorScheme() 
        : mode;
      setColorScheme(newColorScheme);
      setTheme(getTheme(newColorScheme));
    } catch (error) {
      console.error('❌ Failed to set appearance mode:', error);
    }
  };

  return (
    <AppearanceContext.Provider
      value={{
        appearanceMode,
        colorScheme,
        theme,
        setAppearanceMode,
      }}
    >
      {children}
    </AppearanceContext.Provider>
  );
};

export const useAppearance = () => {
  const context = useContext(AppearanceContext);
  if (context === undefined) {
    throw new Error('useAppearance must be used within an AppearanceProvider');
  }
  return context;
};

