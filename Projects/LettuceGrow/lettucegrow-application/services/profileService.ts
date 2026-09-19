/**
 * Profile Service for LettuceGrow
 * Handles profile-related API calls
 */

import { User } from '@/types';
import { apiGet, apiPost, apiPut } from './apiService';

export interface ProfileUpdateData {
  fname?: string;
  mname?: string | null;
  lname?: string;
  username?: string;
  email?: string | null;
  phonenumber?: string | null;
  address?: string | null;
}

export interface ProfileResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    user: User;
  };
}

export interface UploadAvatarResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    profile_img: string;
  };
}

/**
 * Get user profile
 */
export const getProfile = async (token: string): Promise<ProfileResponse> => {
  try {
    console.log('📋 Fetching user profile...');
    
    const response = await apiGet<{ user: any }>('/profile/', token);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || response.message || 'Failed to get profile',
      };
    }

    // Map API user data to User interface
    const apiUser = response.data.user;
    const user: User = {
      id: apiUser.id,
      fname: apiUser.fname,
      mname: apiUser.mname,
      lname: apiUser.lname,
      full_name: apiUser.full_name,
      username: apiUser.username,
      email: apiUser.email,
      role: apiUser.role,
      phonenumber: apiUser.phonenumber,
      address: apiUser.address,
      profile_img: apiUser.profile_img,
      two_factor_enabled: apiUser.two_factor_enabled || false,
      email_verified: apiUser.email_verified_at ? true : false,
    };

    console.log('✅ Profile fetched successfully');
    
    return {
      success: true,
      data: { user },
      message: response.message,
    };
  } catch (error: any) {
    console.error('❌ Get profile error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get profile',
    };
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (
  data: ProfileUpdateData,
  token: string
): Promise<ProfileResponse> => {
  try {
    const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
    const endpoint = '/profile/';
    const fullUrl = `${API_BASE_URL}/api${endpoint}`;
    const method = 'PUT';
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📝 [PROFILE UPDATE] Starting profile update request');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🌐 API Endpoint:', fullUrl);
    console.log('📡 HTTP Method:', method);
    console.log('📦 Request Payload:', JSON.stringify(data, null, 2));
    console.log('🔑 Token Present:', token ? 'Yes' : 'No');
    console.log('───────────────────────────────────────────────────────────');
    
    const response = await apiPut<{ user: any }>(endpoint, data, token);
    
    console.log('📥 [PROFILE UPDATE] Response received');
    console.log('✅ Success:', response.success);
    console.log('📄 Response Data:', JSON.stringify(response.data, null, 2));
    
    if (!response.success) {
      console.log('❌ [PROFILE UPDATE] Update failed');
      console.log('⚠️  Error:', response.error);
      console.log('⚠️  Errors:', response.errors);
    }

    if (!response.success) {
      // Handle validation errors
      if (response.errors) {
        const errorMessages = Object.entries(response.errors)
          .map(([field, messages]) => {
            const msgArray = Array.isArray(messages) ? messages : [messages];
            return `${field}: ${msgArray.join(', ')}`;
          })
          .join('\n');
        
        console.log('❌ [PROFILE UPDATE] Validation errors detected');
        console.error('⚠️  Validation errors:', JSON.stringify(response.errors, null, 2));
        console.log('═══════════════════════════════════════════════════════════');
        return {
          success: false,
          error: errorMessages || response.message || 'Validation failed',
        };
      }
      
      console.log('❌ [PROFILE UPDATE] Update failed');
      console.log('⚠️  Error message:', response.error || response.message);
      console.log('═══════════════════════════════════════════════════════════');
      return {
        success: false,
        error: response.error || response.message || 'Failed to update profile',
      };
    }

    if (!response.data) {
      console.log('❌ [PROFILE UPDATE] No data returned from server');
      console.log('═══════════════════════════════════════════════════════════');
      return {
        success: false,
        error: 'No data returned from server',
      };
    }

    // Map API user data to User interface
    const apiUser = response.data.user;
    const user: User = {
      id: apiUser.id,
      fname: apiUser.fname,
      mname: apiUser.mname,
      lname: apiUser.lname,
      full_name: apiUser.full_name,
      username: apiUser.username,
      email: apiUser.email,
      role: apiUser.role,
      phonenumber: apiUser.phonenumber,
      address: apiUser.address,
      profile_img: apiUser.profile_img,
      two_factor_enabled: apiUser.two_factor_enabled || false,
      email_verified: apiUser.email_verified_at ? true : false,
    };

    console.log('✅ [PROFILE UPDATE] Profile updated successfully!');
    console.log('📊 Updated User Data:');
    console.log('   - ID:', user.id);
    console.log('   - First Name:', user.fname);
    console.log('   - Middle Name:', user.mname || '(null)');
    console.log('   - Last Name:', user.lname);
    console.log('   - Username:', user.username);
    console.log('   - Email:', user.email || '(null)');
    console.log('   - Phone:', user.phonenumber || '(null)');
    console.log('   - Address:', user.address || '(null)');
    console.log('   - Full Name:', user.full_name);
    console.log('═══════════════════════════════════════════════════════════');
    
    return {
      success: true,
      data: { user },
      message: response.message || 'Profile updated successfully',
    };
  } catch (error: any) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('❌ [PROFILE UPDATE] Exception occurred');
    console.log('⚠️  Error Type:', error?.constructor?.name || 'Unknown');
    console.log('⚠️  Error Message:', error?.message || 'Unknown error');
    console.log('⚠️  Error Stack:', error?.stack || 'No stack trace');
    console.log('═══════════════════════════════════════════════════════════');
    return {
      success: false,
      error: error.message || 'Failed to update profile',
    };
  }
};

/**
 * Upload profile image
 */
export const uploadAvatar = async (
  uri: string,
  token: string
): Promise<UploadAvatarResponse> => {
  try {
    console.log('🖼️ Uploading profile image...');

    const filename = uri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const ext = match?.[1]?.toLowerCase();
    let mimeType = 'image/jpeg';

    if (ext === 'png') {
      mimeType = 'image/png';
    } else if (ext === 'jpg' || ext === 'jpeg') {
      mimeType = 'image/jpeg';
    }

    const formData = new FormData();
    formData.append('profile_img', {
      uri,
      name: filename,
      type: mimeType,
    } as any);

    const response = await apiPost<{ profile_img: string }>(
      '/profile/upload-avatar',
      formData,
      token
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || response.message || 'Failed to upload profile image',
      };
    }

    console.log('✅ Profile image uploaded successfully');

    return {
      success: true,
      data: {
        profile_img: response.data.profile_img,
      },
      message: response.message || 'Profile image uploaded successfully',
    };
  } catch (error: any) {
    console.error('❌ Upload profile image error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload profile image',
    };
  }
};
