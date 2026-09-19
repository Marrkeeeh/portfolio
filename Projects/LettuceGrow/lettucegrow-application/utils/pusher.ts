import { API_ROUTES, getApiBaseUrl } from '@/constants/apiRoutes';
import {
  Pusher,
  PusherEvent
} from '@pusher/pusher-websocket-react-native';

// Pusher configuration
export const pusherConfig = {
  apiKey: process.env.EXPO_PUBLIC_PUSHER_KEY || '',
  cluster: process.env.EXPO_PUBLIC_PUSHER_CLUSTER || 'ap1',
};

// Initialize Pusher instance
let pusherInstance: Pusher | null = null;
let currentAuthToken: string | undefined = undefined;

/**
 * Initialize Pusher with authentication endpoint for private channels
 * @param authToken - Bearer token for authenticating private channels
 */
export const initPusher = async (authToken?: string): Promise<Pusher> => {
  // If token changed or instance doesn't exist, reinitialize
  if (!pusherInstance || currentAuthToken !== authToken) {
    // Disconnect existing instance if present
    if (pusherInstance) {
      try {
        await pusherInstance.disconnect();
      } catch (error) {
        console.warn('Error disconnecting Pusher:', error);
      }
    }
    
    pusherInstance = Pusher.getInstance();
    currentAuthToken = authToken;
    
    const config: any = {
      apiKey: pusherConfig.apiKey,
      cluster: pusherConfig.cluster,
    };

    // Configure authentication endpoint with headers
    if (authToken) {
      const authEndpoint = `${getApiBaseUrl()}${API_ROUTES.BROADCASTING.AUTH}`;
      
      // Pusher React Native doesn't reliably send Authorization headers
      // Workaround: Add token as query parameter
      const authEndpointWithToken = `${authEndpoint}?token=${encodeURIComponent(authToken)}`;
      config.authEndpoint = authEndpointWithToken;
      
      // Still try to set headers in case the library supports it
      config.auth = {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json',
        },
      };
      
      console.log('🔐 Auth endpoint configured:', {
        endpoint: authEndpoint,
        hasTokenParam: true,
      });
      
      console.log('🔐 Pusher auth configuration:', {
        authEndpoint: config.authEndpoint,
        hasAuthConfig: !!config.auth,
        hasAuthHeaders: !!config.auth?.headers,
        hasRootHeaders: !!config.headers,
        authorizationHeader: config.auth?.headers?.Authorization ? `${config.auth.headers.Authorization.substring(0, 30)}...` : 'Missing',
        tokenLength: authToken ? authToken.length : 0,
      });
      
      // Verify token is not empty
      if (!authToken || authToken.trim() === '') {
        console.error('⚠️ WARNING: Auth token is empty!');
      }
    } else {
      console.warn('⚠️ No auth token provided to initPusher - private channels will not work');
    }

    await pusherInstance.init(config);
    await pusherInstance.connect();
    
    // Wait for connection to establish (give it time)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Pusher initialized', {
      hasAuth: !!authToken,
      authEndpoint: authToken ? config.authEndpoint : 'none',
      apiKey: config.apiKey ? `${config.apiKey.substring(0, 8)}...` : 'missing',
      cluster: config.cluster,
    });
  }
  return pusherInstance;
};

// Get the Pusher instance
export const getPusher = (): Pusher | null => {
  return pusherInstance;
};

// Subscribe to a channel
export const subscribeToChannel = async (channelName: string, onEvent?: (event: PusherEvent) => void): Promise<any> => {
  const pusher = getPusher();
  if (pusher) {
    return await pusher.subscribe({
      channelName: channelName,
      onEvent: onEvent || ((event: PusherEvent) => {
        console.log(`Event received on ${channelName}:`, event);
      }),
    });
  }
  return null;
};

// Subscribe to a channel with specific event name filtering
export const subscribeToChannelEvent = async (
  channelName: string, 
  eventName: string,
  onEvent: (data: any) => void
): Promise<any> => {
  const pusher = getPusher();
  if (!pusher) {
    console.error('❌ Cannot subscribe: Pusher instance not initialized');
    return null;
  }

  try {
    console.log('🔌 Attempting to subscribe to channel:', channelName);
    console.log('📋 Channel type:', channelName.startsWith('private-') ? 'PRIVATE' : 'PUBLIC');
    console.log('🎯 Event name:', eventName);
    
    // Check connection state
    const connectionState = pusher.connectionState;
    console.log('🔗 Pusher connection state:', connectionState);
    
    const subscription = await pusher.subscribe({
      channelName: channelName,
      onEvent: (event: PusherEvent) => {
        console.log(`📬 Raw event received on ${channelName}:`, {
          eventName: event.eventName,
          channel: event.channelName,
          data: event.data,
        });
        
        // Filter by event name
        if (event.eventName === eventName) {
          console.log(`✅ Matched event name: ${eventName}`);
          // Parse the data if it's a JSON string
          let parsedData = event.data;
          if (typeof event.data === 'string') {
            try {
              parsedData = JSON.parse(event.data);
            } catch (e) {
              console.error('Failed to parse event data:', e);
              parsedData = event.data;
            }
          }
          console.log('📦 Parsed event data:', parsedData);
          onEvent(parsedData);
        } else {
          console.log(`⏭️ Event name mismatch: ${event.eventName} !== ${eventName}`);
        }
      },
      onSubscriptionError: (error: any) => {
        console.error('❌ Subscription error for channel:', channelName);
        console.error('Error type:', error?.type || 'unknown');
        console.error('Error message:', error?.message || error?.error || JSON.stringify(error));
        console.error('Full error:', JSON.stringify(error, null, 2));
      },
      onSubscriptionSucceeded: () => {
        console.log('✅ Successfully subscribed to channel:', channelName);
        console.log('📡 Subscription confirmed - waiting for events...');
      },
    });

    console.log('📡 Subscription object returned:', {
      hasSubscription: !!subscription,
      channelName: channelName,
      subscriptionType: subscription?.constructor?.name || 'unknown',
    });
    
    // Log subscription attempt details
    console.log('📝 Subscription attempt completed. Check Pusher debug console for:');
    console.log('   - "subscribe" event for channel:', channelName);
    console.log('   - Any authentication errors');
    console.log('   - Connection state changes');

    return subscription;
  } catch (error) {
    console.error('❌ Exception while subscribing to channel:', channelName);
    console.error('Error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return null;
  }
};

// Unsubscribe from a channel
export const unsubscribeFromChannel = async (channelName: string): Promise<void> => {
  const pusher = getPusher();
  if (pusher) {
    await pusher.unsubscribe({ channelName });
  }
};

// Disconnect Pusher
export const disconnectPusher = async (): Promise<void> => {
  if (pusherInstance) {
    await pusherInstance.disconnect();
    pusherInstance = null;
  }
};

// PigPen Smart sensor data interface
// Simplified format (when broadcasting only changed values)
export interface PigPenSensorData {
  device_id: number;
  ammonia?: number;
  odor?: number;
  soap_level?: string; // Format: "73.3%"
  tank_level?: string; // Format: "73.3%" (water tank level)
  timestamp: string;
  // Full format (for backward compatibility)
  device_name?: string;
  device_location?: string | null;
  device_status?: string;
  battery_level?: number | null;
  sensors?: {
    ammonia: {
      value: number;
      status: string;
      unit: string;
      recorded_at: string;
    } | null;
    odor: {
      value: number;
      level: string | null;
      status: string;
      unit: string;
      recorded_at: string;
    } | null;
    water_tank: {
      level_percentage: number;
      level_cm: number;
      volume_liters: number | null;
      status: string;
      recorded_at: string;
    } | null;
    soap_tank: {
      level_percentage: number;
      level_cm: number;
      volume_liters: number | null;
      status: string;
      recorded_at: string;
    } | null;
  };
}

// Channel names
// Changed to device-specific channels
export const CHANNELS = {
  DEVICE_MONITORING: (deviceId: number) => `private-device-monitoring.${deviceId}`,
} as const;

// Event names
export const EVENTS = {
  SENSOR_DATA_UPDATED: 'sensor-data-updated', // Real-time sensor data updates
  DEVICE_ONLINE: 'device-online',
  DEVICE_OFFLINE: 'device-offline',
} as const;

/**
 * Test broadcasting authentication endpoint
 */
export const testBroadcastingAuth = async (authToken: string, channelName: string): Promise<void> => {
  try {
    const authUrl = `${getApiBaseUrl()}${API_ROUTES.BROADCASTING.AUTH}`;
    console.log('🧪 Testing broadcasting auth endpoint:', authUrl);
    console.log('🧪 Channel name:', channelName);
    
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        socket_id: '123.456',
        channel_name: channelName,
      }),
    });
    
    const responseText = await response.text();
    console.log('🧪 Auth endpoint response status:', response.status);
    console.log('🧪 Auth endpoint response:', responseText);
    
    if (!response.ok) {
      console.error('❌ Broadcasting auth failed:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
      });
    } else {
      console.log('✅ Broadcasting auth succeeded');
    }
  } catch (error) {
    console.error('❌ Error testing broadcasting auth:', error);
  }
};
