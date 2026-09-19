/**
 * useProfile Hook
 * Custom hook for managing user profile data
 */

import { useAuth } from '@/contexts/AuthContext';
import { getProfile, ProfileUpdateData, updateProfile, uploadAvatar } from '@/services/profileService';
import { User } from '@/types';
import { useCallback, useEffect, useState } from 'react';

export interface UseProfileReturn {
  profile: User | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfileData: (data: ProfileUpdateData) => Promise<{ success: boolean; error?: string; message?: string }>;
  uploadProfileImage: (uri: string) => Promise<{ success: boolean; error?: string; message?: string }>;
}

export const useProfile = (): UseProfileReturn => {
  const { user: authUser, token, refreshUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(authUser || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch profile from API
   */
  const refreshProfile = useCallback(async () => {
    if (!token) {
      setError('Not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getProfile(token);

      if (result.success && result.data) {
        console.log('📋 refreshProfile API user.profile_img =', result.data.user.profile_img);
        setProfile(result.data.user);
      } else {
        setError(result.error || 'Failed to fetch profile');
        setProfile(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  /**
   * Upload profile image
   */
  const uploadProfileImage = useCallback(async (
    uri: string
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await uploadAvatar(uri, token);

      if (result.success) {
        await refreshProfile();
        if (refreshUser) {
          await refreshUser();
        }
        return {
          success: true,
          message: result.message || 'Profile image updated successfully',
        };
      } else {
        const errorMsg = result.error || 'Failed to upload profile image';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to upload profile image';
      setError(errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    } finally {
      setLoading(false);
    }
  }, [token, refreshProfile, refreshUser]);

  /**
   * Update profile
   */
  const updateProfileData = useCallback(async (
    data: ProfileUpdateData
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await updateProfile(data, token);

      if (result.success && result.data) {
        console.log('📝 useProfile: Setting profile from update response:', result.data.user);
        setProfile(result.data.user);
        // Also update the auth context user
        if (refreshUser) {
          await refreshUser();
        }
        // Refresh from backend to ensure we have the absolute latest data
        await refreshProfile();
        return {
          success: true,
          message: result.message || 'Profile updated successfully',
        };
      } else {
        const errorMsg = result.error || 'Failed to update profile';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update profile';
      setError(errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    } finally {
      setLoading(false);
    }
  }, [token, refreshUser, refreshProfile]);

  // Sync with auth user when it changes (but avoid overwriting during updates)
  useEffect(() => {
    if (authUser && !loading) {
      // Only sync if profile is null or if we're not currently updating
      // This prevents overwriting a fresh profile update
      if (!profile) {
        console.log('🔁 useProfile syncing from authUser (profile is null):', authUser);
        setProfile(authUser);
      }
    }
  }, [authUser, loading, profile]);

  // Initial load - refresh from backend once when we have a token but no profile yet
  useEffect(() => {
    if (token && !profile) {
      console.log('📡 useProfile initial refreshProfile() with token');
      refreshProfile();
    }
  }, [token, profile, refreshProfile]);

  return {
    profile,
    loading,
    error,
    refreshProfile,
    updateProfileData,
    uploadProfileImage,
  };
};

