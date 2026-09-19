import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { unregisterPushNotification } from '../modules/PushNotification';
import {
    changePassword,
    confirmTwoFactor,
    disableTwoFactor,
    enableTwoFactor,
    getMe,
    getTwoFactorRecoveryCodes,
    loginUser,
    logoutUser,
    registerUser,
    requestPasswordReset,
    resendActivationOtp,
    resetPassword,
    verifyEmail,
    verifyTwoFactorSetup,
} from '../services/authService';
import type { RegisterData, User } from '../types';
import {
    clearAuthData,
    getAuthData,
    saveAuthData
} from '../utils/authStorage';

/**
 * Auth Context
 * Manages authentication state and provides auth-related functions
 */

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; requires2FA?: boolean }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string; requiresEmailVerification?: boolean }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
  verifyEmailOtp: (otpCode: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  resendEmailOtp: () => Promise<{ success: boolean; error?: string; message?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  resetPassword: (email: string, otpCode: string, password: string, passwordConfirmation: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  changePassword: (currentPassword: string, newPassword: string, passwordConfirmation: string) => Promise<{ success: boolean; error?: string; message?: string; fieldErrors?: Record<string, string[]> }>;
  verifyTwoFactor: (code: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  startTwoFactorSetup: (password: string) => Promise<{ success: boolean; error?: string; message?: string; secret?: string; qrCodeUrl?: string }>;
  verifyTwoFactorSetupCode: (code: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  disableTwoFactorAuth: (password: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  getTwoFactorRecoveryCodesForUser: () => Promise<{ success: boolean; error?: string; message?: string; codes?: string[] }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user data from storage on mount
  useEffect(() => {
    let mounted = true;
    
    loadStoredAuth();
    
    // Safety timeout - ensure loading state doesn't stay true forever
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth loading timeout - setting isLoading to false');
        setIsLoading(false);
      }
    }, 5000); // 5 second timeout
    
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  /**
   * Load stored authentication data
   */
  const loadStoredAuth = async () => {
    try {
      const { token: storedToken, user: storedUser } = await getAuthData();

      if (storedToken && storedUser) {
        console.log('💾 Loaded auth from storage, profile_img =', storedUser.profile_img);
        setToken(storedToken);
        setUser(storedUser);
        // Optionally refresh user data from server
        // await refreshUser();
      }
    } catch (error) {
      console.error('❌ Failed to load auth data:', error);
    } finally {
      // Always set loading to false, even on error
      setIsLoading(false);
    }
  };

  /**
   * Refresh user data from server
   */
  const refreshUser = async () => {
    if (!token) return;

    try {
      console.log('📡 Calling getMe to refresh auth user...');
      const result = await getMe(token);
      if (result.success && result.user) {
        setUser(result.user);
        await saveAuthData(token, result.user);
        console.log('✅ Refreshed auth user, profile_img =', result.user.profile_img);
      }
    } catch (error) {
      console.error('❌ Failed to refresh user:', error);
    }
  };

  /**
   * Login
   */
  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string; requires2FA?: boolean }> => {
    const result = await loginUser(username, password);

    if (result.success && result.data) {
      await saveAuthData(result.data.token, result.data.user);
      setToken(result.data.token);
      setUser(result.data.user);
      return { 
        success: true, 
        requires2FA: result.data.requires_2fa 
      };
    }

    return { success: false, error: result.error };
  };

  /**
   * Register
   */
  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string; requiresEmailVerification?: boolean }> => {
    const result = await registerUser(data);

    if (result.success && result.data) {
      await saveAuthData(result.data.token, result.data.user);
      setToken(result.data.token);
      setUser(result.data.user);
      return { 
        success: true, 
        requiresEmailVerification: result.data.requires_email_verification 
      };
    }

    return { success: false, error: result.error };
  };

  /**
   * Logout
   */
  const logout = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🚪 Logging out...');
      if (token) {
        try {
          await unregisterPushNotification({
            apiBaseUrl: API_BASE_URL,
            apiToken: token,
          });
        } catch (error) {
          console.error('❌ Failed to unregister push notifications:', error);
        }

        const result = await logoutUser(token);
        if (!result.success) {
          // Even if API call fails, clear local data
          await clearAuthData();
          setToken(null);
          setUser(null);
          return { success: false, error: result.error || 'Logout failed' };
        }
      }
      await clearAuthData();
      setToken(null);
      setUser(null);
      console.log('✅ Logout successful');
      return { success: true };
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Clear local data even if API call fails
      await clearAuthData();
      setToken(null);
      setUser(null);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to logout' 
      };
    }
  };

  /**
   * Verify email with OTP
   */
  const verifyEmailOtp = async (otpCode: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const result = await verifyEmail(otpCode, token);
    
    if (result.success) {
      // Refresh user data to get updated email_verified status
      await refreshUser();
    }

    return result;
  };

  /**
   * Resend email activation OTP
   */
  const resendEmailOtp = async (): Promise<{ success: boolean; error?: string; message?: string }> => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    return await resendActivationOtp(token);
  };

  /**
   * Request password reset
   */
  const handleRequestPasswordReset = async (email: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    return await requestPasswordReset(email);
  };

  /**
   * Reset password
   */
  const handleResetPassword = async (
    email: string, 
    otpCode: string, 
    password: string, 
    passwordConfirmation: string
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    return await resetPassword(email, otpCode, password, passwordConfirmation);
  };

  /**
   * Change password for authenticated user
   */
  const handleChangePassword = async (
    currentPassword: string,
    newPassword: string,
    passwordConfirmation: string
  ): Promise<{ success: boolean; error?: string; message?: string; fieldErrors?: Record<string, string[]> }> => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    return await changePassword(currentPassword, newPassword, passwordConfirmation, token);
  };

  /**
   * Verify two-factor authentication code during login
   */
  const verifyTwoFactor = async (
    code: string,
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    return await confirmTwoFactor(code, token);
  };

  /**
   * Start two-factor setup (enable)
   */
  const startTwoFactorSetup = async (
    password: string,
  ): Promise<{ success: boolean; error?: string; message?: string; secret?: string; qrCodeUrl?: string }> => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const result = await enableTwoFactor(password, token);
    return result;
  };

  /**
   * Verify two-factor setup code
   */
  const verifyTwoFactorSetupCode = async (
    code: string,
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const result = await verifyTwoFactorSetup(code, token);
    if (result.success) {
      await refreshUser();
    }
    return result;
  };

  /**
   * Disable two-factor authentication
   */
  const disableTwoFactorAuth = async (
    password: string,
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const result = await disableTwoFactor(password, token);
    if (result.success) {
      await refreshUser();
    }
    return result;
  };

  /**
   * Get two-factor recovery codes
   */
  const getTwoFactorRecoveryCodesForUser = async (): Promise<{ success: boolean; error?: string; message?: string; codes?: string[] }> => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    return await getTwoFactorRecoveryCodes(token);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        logout,
        verifyEmailOtp,
        resendEmailOtp,
        requestPasswordReset: handleRequestPasswordReset,
        resetPassword: handleResetPassword,
        changePassword: handleChangePassword,
        verifyTwoFactor,
        startTwoFactorSetup,
        verifyTwoFactorSetupCode,
        disableTwoFactorAuth,
        getTwoFactorRecoveryCodesForUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export types for use in other components
export type { RegisterData, User };

