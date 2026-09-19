import { apiDelete, apiGet, apiPost, apiPut, type ApiResponse } from "./apiService";

export type DeviceStatus = "unclaimed" | "claimed" | "active" | "inactive";

export interface SmartDevice {
  id: number;
  device_id: string;
  device_pin: string | null;
  user_id: number | null;
  name: string;
  location: string | null;
  status: DeviceStatus;
  date_added: string | null;
  date_installed: string | null;
  plant_growth: any | null;
  settings: any | null;
  wifi_data: any | null;
  created_at: string;
  updated_at: string;
  is_shared?: boolean;
  is_owner?: boolean;
}

export interface DevicesIndexData {
  devices: SmartDevice[];
}

export type DevicesIndexResponse = ApiResponse<DevicesIndexData>;

export interface ClaimDeviceResponse extends ApiResponse<{ device: SmartDevice }> {
  code?: "not_found" | "owned_by_other" | "already_owned" | string;
}

export interface ClaimDevicePayload {
  device_id: string;
  name: string;
  location?: string | null;
  plant_growth?: any;
  settings?: any;
  wifi_data?: any;
  device_pin?: string | null;
}

export const getDevicesForUser = async (
  token: string,
): Promise<DevicesIndexResponse> => {
  return apiGet<DevicesIndexData>("/devices", token);
};

export interface DeviceDetailsData {
  device: SmartDevice;
}

export type DeviceDetailsResponse = ApiResponse<DeviceDetailsData>;

export interface UpdateDevicePayload {
  name?: string;
  location?: string | null;
  status?: DeviceStatus;
  plant_growth?: any;
  settings?: any;
  wifi_data?: any;
  device_pin?: string | null;
}

export const claimDevice = async (
  payload: ClaimDevicePayload,
  token: string,
): Promise<ClaimDeviceResponse> => {
  const response = await apiPost<ClaimDeviceResponse['data']>(
    '/devices/claim',
    payload,
    token,
  );

  return {
    success: !!response.success,
    message: response.message,
    error: response.error,
    // backend may or may not include a structured code; pass it through if present
    code: (response as any).code,
    data: response.data as ClaimDeviceResponse['data'],
  };
};

export const getDeviceById = async (
  id: number,
  token: string,
): Promise<DeviceDetailsResponse> => {
  return apiGet<DeviceDetailsData>(`/devices/${id}`, token);
};

export const updateDevice = async (
  id: number,
  payload: UpdateDevicePayload,
  token: string,
): Promise<DeviceDetailsResponse> => {
  return apiPut<DeviceDetailsData>(`/devices/${id}`, payload, token);
};

export const removeDevice = async (
  id: number,
  token: string,
): Promise<ApiResponse<null>> => {
  return apiDelete<null>(`/devices/${id}`, token);
};

export interface SensorDataPoint {
  value: number;
  timestamp: string;
}

export interface WeeklyTrend {
  week: number;
  avg: number;
  min: number;
  max: number;
  count: number;
  week_start: string;
  week_end: string;
}

export interface SensorHistoryData {
  recent_values: {
    ph: SensorDataPoint[];
    ec: SensorDataPoint[];
    temperature: SensorDataPoint[];
    dissolved_oxygen: SensorDataPoint[];
    turbidity: SensorDataPoint[];
  };
  weekly_trends: {
    ph: WeeklyTrend[];
    ec: WeeklyTrend[];
    temperature: WeeklyTrend[];
    dissolved_oxygen: WeeklyTrend[];
    turbidity: WeeklyTrend[];
  };
  period: {
    start: string;
    end: string;
    weeks: number;
  };
}

export type SensorHistoryResponse = ApiResponse<SensorHistoryData>;

export const getSensorHistory = async (
  deviceId: number,
  token: string,
  weeks: number = 4,
): Promise<SensorHistoryResponse> => {
  return apiGet<SensorHistoryData>(`/devices/${deviceId}/sensor-history?weeks=${weeks}`, token);
};

export interface ControlHistoryItem {
  id: string;
  type: 'algae' | 'ph' | 'ec' | 'notification';
  event: 'started' | 'completed' | 'progress' | 'sent';
  title: string;
  description: string;
  progress?: number;
  timestamp: string;
  created_at: string;
  notification_type?: string; // Optional field for notification types
}

export interface ControlHistoryData {
  history: ControlHistoryItem[];
}

export type ControlHistoryResponse = ApiResponse<ControlHistoryData>;

export const getControlHistory = async (
  deviceId: number,
  token: string,
): Promise<ControlHistoryResponse> => {
  return apiGet<ControlHistoryData>(`/devices/${deviceId}/control-history`, token);
};

// Device Sharing Types and Functions
export interface SharedUser {
  id: number;
  name: string;
  username: string;
  email: string;
  profile_img: string | null;
  shared_at: string;
}

export interface ShareDeviceResponse extends ApiResponse<{ share: any }> {}

export interface SearchUsersResponse extends ApiResponse<{ users: Array<{
  id: number;
  name: string;
  username: string;
  email: string;
  profile_img: string | null;
}> }> {}

export interface ListSharesResponse extends ApiResponse<{ shared_users: SharedUser[] }> {}

export const shareDevice = async (
  deviceId: number,
  userId: number,
  token: string,
): Promise<ShareDeviceResponse> => {
  return apiPost<{ share: any }>(`/devices/${deviceId}/shares`, { user_id: userId }, token);
};

export const unshareDevice = async (
  deviceId: number,
  userId: number,
  token: string,
): Promise<ApiResponse<null>> => {
  return apiDelete<null>(`/devices/${deviceId}/shares/${userId}`, token);
};

export const listDeviceShares = async (
  deviceId: number,
  token: string,
): Promise<ListSharesResponse> => {
  return apiGet<{ shared_users: SharedUser[] }>(`/devices/${deviceId}/shares`, token);
};

export const searchUsersToShare = async (
  deviceId: number,
  query: string,
  token: string,
): Promise<SearchUsersResponse> => {
  return apiGet<{ users: Array<{
    id: number;
    name: string;
    username: string;
    email: string;
    profile_img: string | null;
  }> }>(`/devices/${deviceId}/shares/search-users?q=${encodeURIComponent(query)}`, token);
};