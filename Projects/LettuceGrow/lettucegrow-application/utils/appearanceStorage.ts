import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Appearance Storage Utilities
 * Handles AsyncStorage operations for appearance/theme preferences
 */

export type AppearanceMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'appearanceMode';

/**
 * Save appearance mode to storage
 */
export const saveAppearanceMode = async (mode: AppearanceMode): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, mode);
  } catch (error) {
    console.error('❌ Failed to save appearance mode:', error);
    throw error;
  }
};

/**
 * Get appearance mode from storage
 */
export const getAppearanceMode = async (): Promise<AppearanceMode | null> => {
  try {
    const mode = await AsyncStorage.getItem(STORAGE_KEY);
    return mode as AppearanceMode | null;
  } catch (error) {
    console.error('❌ Failed to get appearance mode:', error);
    return null;
  }
};

/**
 * Remove appearance mode from storage
 */
export const removeAppearanceMode = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('❌ Failed to remove appearance mode:', error);
  }
};

