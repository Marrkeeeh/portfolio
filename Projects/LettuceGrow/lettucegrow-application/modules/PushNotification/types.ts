export interface PushNotificationConfig {
  apiBaseUrl: string;
  apiToken?: string;
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

export interface NotificationPayload {
  title: string;
  body: string;
  data?: NotificationData;
  sound?: string;
  badge?: number;
  channelId?: string;
}

