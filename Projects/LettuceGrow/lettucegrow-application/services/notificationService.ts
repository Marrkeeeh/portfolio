import { apiDelete, apiGet, apiPost, type ApiResponse } from "./apiService";

export interface PushNotificationItem {
  id: number;
  title: string;
  body: string;
  data?: any;
  is_read?: boolean;
  read_at?: string | null;
  created_at: string;
}

export type MyNotificationsResponse = ApiResponse<PushNotificationItem[]> & {
  pagination?: {
    current_page: number;
    total_pages: number;
    per_page: number;
    total: number;
    has_more: boolean;
  };
  unread_count?: number;
};

export const getMyNotifications = async (
  token: string,
  page: number = 1,
  limit: number = 20,
): Promise<MyNotificationsResponse> => {
  return apiGet<PushNotificationItem[]>(
    `/push-notifications/my-notifications?page=${page}&limit=${limit}`,
    token,
  ) as Promise<MyNotificationsResponse>;
};

export const markNotificationAsRead = async (
  id: number,
  token: string,
): Promise<ApiResponse<null>> => {
  return apiPost<null>(`/push-notifications/${id}/mark-as-read`, {}, token);
};

export const markAllNotificationsAsRead = async (
  token: string,
): Promise<ApiResponse<null>> => {
  return apiPost<null>("/push-notifications/mark-all-as-read", {}, token);
};

export const deleteNotification = async (
  id: number,
  token: string,
): Promise<ApiResponse<null>> => {
  return apiDelete<null>(`/push-notifications/${id}`, token);
};
