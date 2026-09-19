/**
 * API Routes Configuration
 * Centralized location for all API endpoint paths
 */

export const API_ROUTES = {
  // Authentication
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    LOGOUT: "/api/auth/logout",
    PROFILE: "/api/auth/profile",
    PROFILE_PICTURE: "/api/auth/profile-picture",
    CHANGE_PASSWORD: "/api/auth/change-password",
    FORGOT_PASSWORD: "/api/auth/forgot-password",
    VERIFY_RESET_CODE: "/api/auth/verify-reset-code",
    RESET_PASSWORD: "/api/auth/reset-password",
  },
  // Broadcasting
  BROADCASTING: {
    AUTH: "/broadcasting/auth",
  },
} as const;

/**
 * Helper function to get API base URL based on environment
 */
export const getApiBaseUrl = (): string => {
  return process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:8004";
};
