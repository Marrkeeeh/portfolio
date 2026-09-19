/**
 * Auth Service for LettuceGrow
 * Handles all authentication-related API calls
 */

import type {
  GetUserResponse,
  LoginResponse,
  LoginResponseData,
  RegisterData,
  RegisterResponse,
  RegisterResponseData,
  User,
} from '../types';
import { apiGet, apiPost } from './apiService';

/**
 * Convert API response to User object
 */
const mapApiUserToUser = (apiUser: any): User => {
  return {
    id: apiUser.id,
    fname: apiUser.fname,
    mname: apiUser.mname,
    lname: apiUser.lname,
    full_name: apiUser.full_name,
    username: apiUser.username,
    email: apiUser.email,
    phonenumber: apiUser.phonenumber,
    address: apiUser.address,
    role: apiUser.role,
    profile_img: apiUser.profile_img,
    email_verified: apiUser.email_verified || apiUser.email_verified_at !== null,
    two_factor_enabled: apiUser.two_factor_enabled,
  };
};

/**
 * Login user
 */
export const loginUser = async (username: string, password: string): Promise<LoginResponse> => {
  try {
    console.log('🔐 Attempting login for:', username);
    
    const response = await apiPost<LoginResponseData>('/auth/login', {
      username,
      password,
    });

    if (!response.success) {
      return { 
        success: false, 
        error: response.error || response.message || 'Login failed' 
      };
    }

    if (response.data) {
      const user = mapApiUserToUser(response.data.user);
      console.log('✅ Login successful for user:', user.username);
      
      return {
        success: true,
        data: {
          user,
          token: response.data.token,
          requires_2fa: response.data.requires_2fa,
        },
      };
    }

    return { success: false, error: 'Invalid response from server' };
  } catch (error: any) {
    console.error('❌ Login error:', error);
    return { success: false, error: error.message || 'Failed to login' };
  }
};

/**
 * Start two-factor authentication setup (enable)
 */
export const enableTwoFactor = async (
  password: string,
  token: string
): Promise<{ success: boolean; error?: string; message?: string; secret?: string; qrCodeUrl?: string }> => {
  try {
    console.log('🔐 Enabling two-factor authentication...');

    const response = await apiPost<{ secret: string; qr_code_url: string }>('/2fa/enable', { password }, token);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || response.message || 'Failed to enable two-factor authentication',
        message: response.message,
      };
    }

    return {
      success: true,
      message: response.message || 'Two-factor authentication enabled',
      secret: response.data.secret,
      qrCodeUrl: response.data.qr_code_url,
    };
  } catch (error: any) {
    console.error('❌ Enable two-factor error:', error);
    return {
      success: false,
      error: error.message || 'Failed to enable two-factor authentication',
    };
  }
};

/**
 * Verify two-factor authentication setup code
 */
export const verifyTwoFactorSetup = async (
  code: string,
  token: string
): Promise<{ success: boolean; error?: string; message?: string }> => {
  try {
    console.log('🔐 Verifying two-factor setup code...');

    const response = await apiPost('/2fa/verify', { code }, token);

    if (!response.success) {
      return {
        success: false,
        error: response.message || response.error || 'Invalid verification code',
        message: response.message,
      };
    }

    return {
      success: true,
      message: response.message || 'Two-factor authentication confirmed',
    };
  } catch (error: any) {
    console.error('❌ Verify two-factor setup error:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify two-factor code',
    };
  }
};

/**
 * Disable two-factor authentication
 */
export const disableTwoFactor = async (
  password: string,
  token: string
): Promise<{ success: boolean; error?: string; message?: string }> => {
  try {
    console.log('🔐 Disabling two-factor authentication...');

    const response = await apiPost('/2fa/disable', { password }, token);

    if (!response.success) {
      return {
        success: false,
        error: response.message || response.error || 'Failed to disable two-factor authentication',
        message: response.message,
      };
    }

    return {
      success: true,
      message: response.message || 'Two-factor authentication disabled',
    };
  } catch (error: any) {
    console.error('❌ Disable two-factor error:', error);
    return {
      success: false,
      error: error.message || 'Failed to disable two-factor authentication',
    };
  }
};

/**
 * Get two-factor recovery codes
 */
export const getTwoFactorRecoveryCodes = async (
  token: string
): Promise<{ success: boolean; error?: string; message?: string; codes?: string[] }> => {
  try {
    console.log('🔐 Fetching two-factor recovery codes...');

    const response = await apiPost<{ recovery_codes: string[] }>('/2fa/recovery-codes', {}, token);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || response.message || 'Failed to get recovery codes',
        message: response.message,
      };
    }

    return {
      success: true,
      codes: response.data.recovery_codes,
      message: response.message,
    };
  } catch (error: any) {
    console.error('❌ Get recovery codes error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get recovery codes',
    };
  }
};

/**
 * Confirm two-factor authentication code during login
 */
export const confirmTwoFactor = async (
  code: string,
  token: string
): Promise<{ success: boolean; error?: string; message?: string }> => {
  try {
    console.log('🔐 Confirming two-factor code...');

    const response = await apiPost('/2fa/confirm', { code }, token);

    if (!response.success) {
      return {
        success: false,
        error: response.message || response.error || 'Two-factor verification failed',
        message: response.message,
      };
    }

    return {
      success: true,
      message: response.message || 'Two-factor authentication verified',
    };
  } catch (error: any) {
    console.error('❌ Two-factor confirm error:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify two-factor code',
    };
  }
};

/**
 * Change password for authenticated user
 */
export const changePassword = async (
  currentPassword: string,
  newPassword: string,
  passwordConfirmation: string,
  token: string
): Promise<{ success: boolean; error?: string; message?: string; fieldErrors?: Record<string, string[]> }> => {
  try {
    console.log('🔐 Changing password...');

    const response = await apiPost('/auth/change-password', {
      current_password: currentPassword,
      password: newPassword,
      password_confirmation: passwordConfirmation,
    }, token);

    if (!response.success) {
      return {
        success: false,
        error: response.error || response.message || 'Failed to change password',
        message: response.message,
        fieldErrors: response.errors,
      };
    }

    return {
      success: true,
      message: response.message || 'Password updated successfully',
    };
  } catch (error: any) {
    console.error('❌ Change password error:', error);
    return {
      success: false,
      error: error.message || 'Failed to change password',
    };
  }
};

/**
 * Register new user
 */
export const registerUser = async (data: RegisterData): Promise<RegisterResponse> => {
  try {
    console.log('📝 Attempting registration for:', data.username);
    
    const response = await apiPost<RegisterResponseData>('/auth/register', {
      fname: data.fname,
      mname: data.mname,
      lname: data.lname,
      username: data.username,
      email: data.email,
      password: data.password,
      password_confirmation: data.password_confirmation,
      phonenumber: data.phonenumber,
      address: data.address,
    });

    if (!response.success) {
      return { 
        success: false, 
        error: response.error || response.message || 'Registration failed',
      };
    }

    if (response.data) {
      const user = mapApiUserToUser(response.data.user);
      console.log('✅ Registration successful for user:', user.username);
      
      return {
        success: true,
        data: {
          user,
          token: response.data.token,
          requires_email_verification: response.data.requires_email_verification,
        },
        message: response.message,
      };
    }

    return { success: false, error: 'Invalid response from server' };
  } catch (error: any) {
    console.error('❌ Registration error:', error);
    return { success: false, error: error.message || 'Failed to register' };
  }
};

/**
 * Verify email with OTP
 */
export const verifyEmail = async (
  otpCode: string,
  token: string
): Promise<{ success: boolean; error?: string; message?: string }> => {
  try {
    console.log('📧 Verifying email with OTP...');
    
    const response = await apiPost('/auth/verify-email', {
      otp_code: otpCode,
    }, token);

    if (!response.success) {
      // Return the specific error message from the backend
      return { 
        success: false, 
        error: response.message || response.error || 'Email verification failed',
        message: response.message,
      };
    }

    console.log('✅ Email verified successfully');
    
    return { success: true, message: response.message };
  } catch (error: any) {
    console.error('❌ Email verification error:', error);
    return { success: false, error: error.message || 'Failed to verify email' };
  }
};

/**
 * Resend email activation OTP
 */
export const resendActivationOtp = async (
  token: string
): Promise<{ success: boolean; error?: string; message?: string }> => {
  try {
    console.log('📧 Resending activation OTP...');
    
    const response = await apiPost('/auth/resend-activation-otp', {}, token);

    if (!response.success) {
      return { 
        success: false, 
        error: response.error || response.message || 'Failed to resend OTP' 
      };
    }

    console.log('✅ Activation OTP resent successfully');
    
    return { success: true, message: response.message };
  } catch (error: any) {
    console.error('❌ Resend OTP error:', error);
    return { success: false, error: error.message || 'Failed to resend OTP' };
  }
};

/**
 * Request password reset (sends OTP)
 */
export const requestPasswordReset = async (email: string): Promise<{ success: boolean; error?: string; message?: string }> => {
  try {
    console.log('📧 Sending password reset OTP to:', email);
    
    const response = await apiPost('/auth/forgot-password', {
      email,
    });

    console.log('📧 Forgot password response:', JSON.stringify(response, null, 2));

    if (!response.success) {
      return { 
        success: false, 
        error: response.error || response.message || 'Failed to send reset OTP',
        message: response.message,
      };
    }
    
    return { 
      success: true, 
      message: response.message || 'Password reset OTP has been sent to your email' 
    };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Failed to send reset OTP. Please check your connection and try again.' 
    };
  }
};

/**
 * Reset password with OTP
 */
export const resetPassword = async (
  email: string,
  otpCode: string,
  password: string,
  passwordConfirmation: string
): Promise<{ success: boolean; error?: string; message?: string }> => {
  try {
    console.log('🔐 Resetting password with OTP...');
    
    const response = await apiPost('/auth/reset-password', {
      email,
      otp_code: otpCode,
      password,
      password_confirmation: passwordConfirmation,
    });

    if (!response.success) {
      return { 
        success: false, 
        error: response.error || response.message || 'Failed to reset password' 
      };
    }

    console.log('✅ Password reset successfully');
    
    return { success: true, message: response.message };
  } catch (error: any) {
    console.error('❌ Reset password error:', error);
    return { success: false, error: error.message || 'Failed to reset password' };
  }
};

/**
 * Logout user
 */
export const logoutUser = async (token: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🚪 Logging out...');
    
    const response = await apiPost('/auth/logout', {}, token);

    if (!response.success) {
      return { 
        success: false, 
        error: response.error || response.message || 'Logout failed' 
      };
    }

    console.log('✅ Logout successful');
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ Logout error:', error);
    return { success: false, error: error.message || 'Failed to logout' };
  }
};

/**
 * Get authenticated user
 */
export const getMe = async (token: string): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    // Use GET /auth/me to match backend route
    const response = await apiGet<GetUserResponse['data']>('/auth/me', token);

    if (!response.success || !response.data) {
      console.warn('⚠️ getMe failed:', response.error || response.message);
      return { 
        success: false, 
        error: response.error || response.message || 'Failed to get user data' 
      };
    }

    const user = mapApiUserToUser(response.data.user);
    console.log('👤 getMe user.profile_img =', user.profile_img);
    
    return { success: true, user };
  } catch (error: any) {
    console.error('❌ Get user error:', error);
    return { success: false, error: error.message || 'Failed to get user data' };
  }
};

// Re-export types for convenience
export type { RegisterData, User };

