import { useNotificationResponse, usePushNotifications } from '@/modules/PushNotification';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

/**
 * Example implementation of custom push notifications in PigPenSmart
 * 
 * This is a reference implementation showing how to integrate the custom
 * push notification module into your app.
 */

// Example 1: Initialize push notifications in your root layout
export function AppWithPushNotifications() {
  const { isRegistered, error } = usePushNotifications(
    {
      // Update this with your Laravel backend URL
      apiBaseUrl: __DEV__ 
        ? 'http://10.0.2.2:8000'  // Android emulator
        : 'https://your-production-api.com',
      
      // Optional: Add bearer token for authenticated requests
      // apiToken: 'your-auth-token',
    },
    // Optional: Pass user ID for user-specific notifications
    // You might get this from your auth context
    undefined // or: getUserId()
  );

  useEffect(() => {
    if (isRegistered) {
      console.log('✅ Push notifications registered successfully');
    }
    if (error) {
      console.error('❌ Push notification error:', error);
    }
  }, [isRegistered, error]);

  return null; // Your app components
}

// Example 2: Handle notification taps (navigation)
export function NotificationHandler() {
  const router = useRouter();
  const notificationData = useNotificationResponse();

  useEffect(() => {
    if (notificationData) {
      console.log('User tapped notification:', notificationData);

      // Navigate based on notification data
      if (notificationData.screen) {
        router.push(notificationData.screen as any);
      }

      // Handle different notification types
      switch (notificationData.type) {
        case 'alert':
          router.push('/(drawer)/(tabs)/monitoring');
          break;
        case 'report':
          router.push('/(drawer)/(tabs)/reports');
          break;
        case 'device':
          router.push('/(drawer)/devices');
          break;
        default:
          router.push('/(drawer)/(tabs)/home');
      }
    }
  }, [notificationData]);

  return null;
}

// Example 3: Integration with AuthContext
export function usePushNotificationWithAuth() {
  // Uncomment and import your auth context
  // import { useAuth } from '@/contexts/AuthContext';
  // const { user, authToken } = useAuth();
  
  const { isRegistered, error } = usePushNotifications(
    {
      apiBaseUrl: 'http://your-backend-url.com',
      // apiToken: authToken, // Use actual auth token
    },
    // user?.id // Use actual user ID
    undefined
  );

  return { isRegistered, error };
}

// Example 4: Unregister on logout
import { unregisterPushNotification } from '@/modules/PushNotification';

export async function handleLogout() {
  try {
    // Unregister device from push notifications
    await unregisterPushNotification({
      apiBaseUrl: 'http://your-backend-url.com',
      apiToken: 'your-auth-token',
    });
    
    console.log('Device unregistered from push notifications');
    
    // Continue with logout process...
  } catch (error) {
    console.error('Failed to unregister device:', error);
  }
}

// Example 5: In your root _layout.tsx
/**
 * Add this to your app/_layout.tsx or app/(drawer)/_layout.tsx
 */
/*
import { usePushNotifications } from '@/modules/PushNotification';

export default function RootLayout() {
  const { isRegistered, error } = usePushNotifications({
    apiBaseUrl: __DEV__ ? 'http://10.0.2.2:8000' : 'https://api.pigpensmart.com',
  });

  // Rest of your layout code...
}
*/

// Example 6: Backend integration - Sending notifications from Laravel

/**
 * In your Laravel controllers, you can send notifications like this:
 * 
 * use App\Services\PushNotificationService;
 * use App\DTOs\NotificationDTO;
 * 
 * class SensorAlertController extends Controller
 * {
 *     public function __construct(
 *         private PushNotificationService $pushNotificationService
 *     ) {}
 * 
 *     public function sendTemperatureAlert(int $userId, float $temperature)
 *     {
 *         $notification = new NotificationDTO(
 *             title: 'Temperature Alert',
 *             body: "Temperature exceeded threshold: {$temperature}°C",
 *             data: [
 *                 'type' => 'alert',
 *                 'screen' => '/(drawer)/(tabs)/monitoring',
 *                 'sensor_type' => 'temperature',
 *                 'value' => $temperature,
 *             ],
 *             userId: $userId
 *         );
 * 
 *         return $this->pushNotificationService->sendToUser($notification);
 *     }
 * }
 */

// Example 7: Constants for notification types
export const NotificationTypes = {
  TEMPERATURE_ALERT: 'temperature_alert',
  HUMIDITY_ALERT: 'humidity_alert',
  WATER_LEVEL_ALERT: 'water_alert',
  FEED_REMINDER: 'feed_reminder',
  SYSTEM_UPDATE: 'system_update',
  DEVICE_OFFLINE: 'device_offline',
} as const;

export const NotificationScreens = {
  HOME: '/(drawer)/(tabs)/home',
  MONITORING: '/(drawer)/(tabs)/monitoring',
  CONTROL: '/(drawer)/(tabs)/control',
  REPORTS: '/(drawer)/(tabs)/reports',
  DEVICES: '/(drawer)/devices',
  SETTINGS: '/(drawer)/settings',
} as const;

