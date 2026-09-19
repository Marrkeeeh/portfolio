import { useAppearance } from "@/contexts/AppearanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import "@/global.css";
import { useNotificationReceived } from "@/modules/PushNotification";
import { deleteNotification, getMyNotifications, markNotificationAsRead, type PushNotificationItem } from "@/services/notificationService";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export default function AlertsScreen() {
  const { theme } = useAppearance();
  const { token } = useAuth();
  const { setUnreadCount } = useNotifications();
  const receivedNotification = useNotificationReceived();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const mapNotificationToAlert = useCallback((notification: PushNotificationItem): Alert => {
    const severity = (notification.data?.severity as string | undefined) ?? "info";

    let type: Alert["type"] = "info";
    if (severity === "critical") {
      type = "error";
    } else if (severity === "warning") {
      type = "warning";
    } else if (severity === "success") {
      type = "success";
    }

    let timestamp = "";
    try {
      timestamp = new Date(notification.created_at).toLocaleString();
    } catch {
      timestamp = notification.created_at;
    }

    return {
      id: String(notification.id),
      type,
      title: notification.title,
      message: notification.body,
      timestamp,
      read: notification.is_read ?? !!notification.read_at,
    };
  }, []);

  const loadAlerts = useCallback(async () => {
    if (!token) {
      setAlerts([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const response = await getMyNotifications(token);
      if (!response.success || !response.data) {
        setAlerts([]);
        setUnreadCount(0);
        return;
      }

      const mapped = response.data.map(mapNotificationToAlert);
      setAlerts(mapped);

      const unread = mapped.filter((alert) => !alert.read).length;
      setUnreadCount(unread);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [mapNotificationToAlert, setUnreadCount, token]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    if (!receivedNotification) {
      return;
    }
    void loadAlerts();
  }, [receivedNotification, loadAlerts]);

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return theme.error;
      case 'warning':
        return theme.warning;
      case 'info':
        return theme.info;
      case 'success':
        return theme.success;
      default:
        return theme.textSecondary;
    }
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      case 'info':
        return 'information-circle';
      case 'success':
        return 'checkmark-circle';
      default:
        return 'ellipse';
    }
  };

  const markAsRead = useCallback((id: string) => {
    setAlerts((current) => {
      const updated = current.map((alert) =>
        alert.id === id ? { ...alert, read: true } : alert,
      );
      const unread = updated.filter((alert) => !alert.read).length;
      setUnreadCount(unread);
      return updated;
    });
  }, [setUnreadCount]);

  const handlePressAlert = useCallback(
    async (id: string) => {
      markAsRead(id);

      if (!token) {
        return;
      }

      try {
        await markNotificationAsRead(Number(id), token);
      } catch {
        // Ignore errors, UI already updated optimistically
      }
    },
    [markAsRead, token],
  );

  const handleDeleteAlert = useCallback(
    async (id: string) => {
      if (!token) {
        return;
      }

      setAlerts((current) => {
        const updated = current.filter((alert) => alert.id !== id);
        const unread = updated.filter((alert) => !alert.read).length;
        setUnreadCount(unread);
        return updated;
      });

      try {
        await deleteNotification(Number(id), token);
      } catch {
        // ignore errors, UI already updated optimistically
      }
    },
    [setUnreadCount, token],
  );

  const handleRefresh = useCallback(async () => {
    if (!token) {
      return;
    }
    setRefreshing(true);
    try {
      await loadAlerts();
    } finally {
      setRefreshing(false);
    }
  }, [loadAlerts, token]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundSecondary }} edges={['bottom']}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text, marginBottom: 8 }}>
            Alerts
          </Text>
          <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 24 }}>
            View and manage system alerts
          </Text>
          {loading && alerts.length === 0 && (
            <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 12 }}>
              Loading alerts...
            </Text>
          )}

          {/* Alerts List */}
          <View>
            {alerts.map((alert) => {
              const alertColor = getAlertColor(alert.type);
              const alertIcon = getAlertIcon(alert.type);
              
              return (
                <TouchableOpacity
                  key={alert.id}
                  onPress={() => handlePressAlert(alert.id)}
                  onLongPress={() => handleDeleteAlert(alert.id)}
                  style={{
                    backgroundColor: theme.background,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    borderLeftWidth: 4,
                    borderLeftColor: alertColor,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 2,
                    opacity: alert.read ? 0.7 : 1,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <Ionicons 
                      name={alertIcon} 
                      size={24} 
                      color={alertColor} 
                      style={{ marginRight: 12, marginTop: 2 }} 
                    />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, flex: 1 }}>
                          {alert.title}
                        </Text>
                        {!alert.read && (
                          <View 
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: alertColor,
                              marginLeft: 8,
                            }}
                          />
                        )}
                      </View>
                      <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 8 }}>
                        {alert.message}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.textTertiary }}>
                        {alert.timestamp}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

