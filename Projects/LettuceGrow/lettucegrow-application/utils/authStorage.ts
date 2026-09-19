import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../types';

/**
 * Auth Storage Utilities
 * Handles all AsyncStorage operations for authentication
 */

const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER: 'user',
} as const;

/**
 * Save authentication token to storage
 */
export const saveAuthToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  } catch (error) {
    console.error('❌ Failed to save auth token:', error);
    throw error;
  }
};

/**
 * Get authentication token from storage
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error('❌ Failed to get auth token:', error);
    return null;
  }
};

/**
 * Remove authentication token from storage
 */
export const removeAuthToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error('❌ Failed to remove auth token:', error);
  }
};

/**
 * Save user data to storage
 */
export const saveUserData = async (user: User): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (error) {
    console.error('❌ Failed to save user data:', error);
    throw error;
  }
};

/**
 * Get user data from storage
 */
export const getUserData = async (): Promise<User | null> => {
  try {
    const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('❌ Failed to get user data:', error);
    return null;
  }
};

/**
 * Remove user data from storage
 */
export const removeUserData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
  } catch (error) {
    console.error('❌ Failed to remove user data:', error);
  }
};

/**
 * Save both token and user data
 */
export const saveAuthData = async (token: string, user: User): Promise<void> => {
  await saveAuthToken(token);
  await saveUserData(user);
};

/**
 * Get both token and user data
 */
export const getAuthData = async (): Promise<{ token: string | null; user: User | null }> => {
  const [token, user] = await Promise.all([
    getAuthToken(),
    getUserData(),
  ]);
  return { token, user };
};

/**
 * Clear all authentication data
 */
export const clearAuthData = async (): Promise<void> => {
  await Promise.all([
    removeAuthToken(),
    removeUserData(),
  ]);
};
