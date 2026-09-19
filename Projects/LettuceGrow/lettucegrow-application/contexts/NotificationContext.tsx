import { useNotificationReceived } from '@/modules/PushNotification';
import { getMyNotifications } from '@/services/notificationService';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const receivedNotification = useNotificationReceived();

  const refreshUnreadCount = useCallback(async () => {
    if (!token) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await getMyNotifications(token);
      if (response.success) {
        if (typeof response.unread_count === 'number') {
          setUnreadCount(response.unread_count);
        } else if (Array.isArray(response.data)) {
          const unread = response.data.filter((n) => !(n as any).is_read && !(n as any).read_at).length;
          setUnreadCount(unread);
        }
      }
    } catch {
      // ignore errors, keep current unreadCount
    }
  }, [token]);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!receivedNotification) return;
    void refreshUnreadCount();
  }, [receivedNotification, refreshUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        setUnreadCount,
        refreshUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
};
