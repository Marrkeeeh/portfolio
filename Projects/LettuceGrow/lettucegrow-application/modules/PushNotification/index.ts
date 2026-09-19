import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

// Global flag to prevent duplicate registrations across component remounts
let isGloballyRegistering = false;
let lastGlobalUserId: number | string | undefined = undefined;
let hasRegisteredThisSession = false; // Track if we've registered at all this session

const PUSH_NOTIFICATIONS_ENABLED_KEY = 'pushNotificationsEnabled';

// Initialize with default enabled
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Check preference
    try {
      const preference = await AsyncStorage.getItem(PUSH_NOTIFICATIONS_ENABLED_KEY);
      const pushEnabled = preference === null ? true : preference === 'true';
      
      if (!pushEnabled) {
        // Push notifications disabled - suppress native notification
        // The toast will be shown via NotificationContext
        return {
          shouldShowBanner: false,
          shouldShowList: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        };
      }
    } catch (error) {
      console.error('Error checking push notification preference:', error);
      // Default to enabled on error
    }

    // Push notifications enabled - show native notification
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

export interface PushNotificationConfig {
  apiBaseUrl: string;
  apiToken?: string;
  enabled?: boolean; // Optional flag to enable/disable registration
}

export interface DeviceTokenData {
  expoToken: string;
  deviceToken: string;
  platform: string;
  deviceId: string;
  deviceName: string;
}

export interface NotificationData {
  [key: string]: any;
}

/**
 * Register device for push notifications
 * Supports both Expo Go and standalone builds for Android and iOS
 */
async function registerForPushNotificationsAsync(): Promise<DeviceTokenData | null> {
  let expoToken = '';
  let deviceToken = '';

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // Support both physical devices AND Expo Go
  if (Device.isDevice || Platform.OS === 'android' || Platform.OS === 'ios') {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      } catch (error) {
        console.error('Error requesting notification permissions:', error);
        return null;
      }
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push notification permissions');
      return null;
    }

    try {
      // Get Expo Push Token (works in Expo Go for both Android and iOS)
      const expoPushToken = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      expoToken = expoPushToken.data;

      // Get Device Push Token (FCM for Android, APNs for iOS)
      // This will work in Expo Go for testing
      try {
        const devicePushToken = await Notifications.getDevicePushTokenAsync();
        deviceToken = devicePushToken.data;
      } catch (error) {
        // In Expo Go, device token might not be available
        // Use expo token as fallback
        console.log('⚠️ Device token not available (Expo Go), using Expo token');
        deviceToken = expoToken;
      }

      return {
        expoToken,
        deviceToken,
        platform: Platform.OS,
        deviceId: Constants.sessionId || '',
        deviceName: Device.deviceName || `${Device.brand} ${Device.modelName}` || 'Unknown Device',
      };
    } catch (error) {
      console.error('Error getting push tokens:', error);
      return null;
    }
  } else if (Platform.OS === 'web') {
    console.log('Push notifications are not supported on web');
    return null;
  } else {
    console.log('Must use physical device for Push Notifications');
    return null;
  }
}

/**
 * Main hook to register push notifications with your backend
 */
export function usePushNotifications(config: PushNotificationConfig, userId?: number | string) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  useEffect(() => {
    // Don't register if explicitly disabled
    if (config.enabled === false) {
      console.log('⏸️ Push notification registration disabled, waiting...');
      return undefined;
    }

    // Support Expo Go for iOS/Android, and physical devices
    if (Platform.OS === 'web') return undefined;
    if (!Device.isDevice && Platform.OS !== 'android' && Platform.OS !== 'ios') {
      console.log('⚠️ Push notifications require a physical device or Expo Go');
      return undefined;
    }

    console.log('🔄 Push notification effect triggered with userId:', userId);

    // Prevent duplicate registration using global flag
    if (isGloballyRegistering) {
      console.log('⏳ Already registering globally, skipping...');
      return undefined;
    }

    // If already registered this session, only re-register if userId changed to a real value
    if (hasRegisteredThisSession) {
      // If we registered without userId (undefined) and now have one, re-register
      if (lastGlobalUserId === undefined && userId !== undefined) {
        console.log('🔄 Re-registering with userId after initial registration');
      }
      // If userId is the same or both are undefined, skip
      else if (lastGlobalUserId === userId) {
        console.log('✅ Already registered with same userId, skipping...');
        return undefined;
      }
    }

    isGloballyRegistering = true;

    registerForPushNotificationsAsync()
      .then(async (tokenData) => {
        if (!tokenData) {
          setError('Failed to get push tokens');
          return;
        }

        console.log('📱 Device token data obtained:', tokenData);

        // Register with your backend
        try {
          const userIdToSend = userId ? (typeof userId === 'string' ? parseInt(userId, 10) : userId) : undefined;
          console.log('🔢 Sending userId to backend:', userIdToSend, 'Type:', typeof userIdToSend);
          
          const requestBody = {
            ...tokenData,
            userId: userIdToSend,
          };
          
          console.log('📤 Request body for push notification registration:', JSON.stringify(requestBody, null, 2));

          const response = await fetch(`${config.apiBaseUrl}/api/push-notifications/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(config.apiToken && { Authorization: `Bearer ${config.apiToken}` }),
            },
            body: JSON.stringify(requestBody),
          });

          console.log('📥 Response status:', response.status);
          
          const responseData = await response.json();
          console.log('📥 Response data:', JSON.stringify(responseData, null, 2));

          if (response.ok) {
            setIsRegistered(true);
            lastGlobalUserId = userId;
            hasRegisteredThisSession = true;
            console.log('✅ Successfully registered push notification token with user_id:', userId);
          } else {
            setError(responseData.message || 'Failed to register token');
            console.error('❌ Failed to register push token:', responseData);
          }
        } catch (err) {
          console.error('❌ Error registering push token:', err);
          setError('Network error while registering token');
        } finally {
          isGloballyRegistering = false;
        }
      })
      .catch((err) => {
        console.error('❌ Error in push notification setup:', err);
        setError('Setup error');
        isGloballyRegistering = false;
      });

    // Listener for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received in foreground:', notification);
    });

    // Listener for when user taps on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [config.apiBaseUrl, config.apiToken, config.enabled, userId]);

  return { isRegistered, error };
}

/**
 * Hook to get notification data when user taps on notification
 * Supports Expo Go and standalone builds
 */
export function useNotificationResponse() {
  const [notificationData, setNotificationData] = useState<NotificationData | null>(null);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    if (!Device.isDevice && Platform.OS !== 'android' && Platform.OS !== 'ios') {
      return undefined;
    }

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      setNotificationData(response.notification.request.content.data);
    });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return notificationData;
}

/**
 * Hook to get notification data when received in foreground
 * Supports Expo Go and standalone builds
 * Returns an object with title, body, and data from the notification
 */
export function useNotificationReceived() {
  const [notificationData, setNotificationData] = useState<any | null>(null);
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    if (!Device.isDevice && Platform.OS !== 'android' && Platform.OS !== 'ios') {
      return undefined;
    }

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      // Return both the data and the notification content (title, body)
      setNotificationData({
        ...notification.request.content.data,
        title: notification.request.content.title,
        body: notification.request.content.body,
      });
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
    };
  }, []);

  return notificationData;
}

/**
 * Unregister device from push notifications
 * Supports Expo Go and standalone builds
 */
export async function unregisterPushNotification(config: PushNotificationConfig): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return false;
    if (!Device.isDevice && Platform.OS !== 'android' && Platform.OS !== 'ios') {
      return false;
    }

    const expoPushToken = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    const response = await fetch(`${config.apiBaseUrl}/api/push-notifications/unregister`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiToken && { Authorization: `Bearer ${config.apiToken}` }),
      },
      body: JSON.stringify({
        expoToken: expoPushToken.data,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error unregistering push notification:', error);
    return false;
  }
}

/**
 * Get notification badge count
 */
export async function getNotificationBadgeCount(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set notification badge count
 */
export async function setNotificationBadgeCount(count: number): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.dismissAllNotificationsAsync();
}

