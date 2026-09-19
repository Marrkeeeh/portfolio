/**
 * Authentication Types
 * Type definitions for authentication-related API responses and data structures
 */

/**
 * User interface matching the Laravel backend response
 */
export interface User {
  id: number;
  fname: string;
  mname?: string;
  lname: string;
  full_name?: string;
  username: string;
  email: string;
  phonenumber?: string;
  address?: string;
  role: string;
  profile_img?: string;
  email_verified?: boolean;
  two_factor_enabled?: boolean;
}

/**
 * Registration form data
 */
export interface RegisterData {
  fname: string;
  mname?: string;
  lname: string;
  username: string;
  email: string;
  password: string;
  password_confirmation: string;
  phonenumber?: string;
  address?: string;
}

/**
 * Login API response data structure
 */
export interface LoginResponseData {
  user: User;
  token: string;
  requires_2fa?: boolean;
}

/**
 * Register API response data structure
 */
export interface RegisterResponseData {
  user: User;
  token: string;
  requires_email_verification?: boolean;
}

/**
 * Login API response
 */
export interface LoginResponse {
  success: boolean;
  message?: string;
  data?: LoginResponseData;
  error?: string;
}

/**
 * Register API response
 */
export interface RegisterResponse {
  success: boolean;
  message?: string;
  data?: RegisterResponseData;
  error?: string;
}

/**
 * Email verification response
 */
export interface VerifyEmailResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    user: {
      id: number;
      email: string;
      email_verified: boolean;
    };
  };
}

/**
 * Password reset request response
 */
export interface PasswordResetRequestResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Password reset response
 */
export interface PasswordResetResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Get user response
 */
export interface GetUserResponse {
  success: boolean;
  data?: {
    user: User;
  };
  error?: string;
  message?: string;
}

/**
 * Logout response
 */
export interface LogoutResponse {
  success: boolean;
  message?: string;
  error?: string;
}

