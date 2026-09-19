import { useAppearance } from "@/contexts/AppearanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDeviceSelection } from "@/contexts/DeviceSelectionContext";
import { getControlHistory, type ControlHistoryItem } from "@/services/deviceService";
import "@/global.css";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type HistoryFilter = 'All' | 'Treatments' | 'Adjustments' | 'Maintenance' | 'Alerts';

interface HistoryItem {
  id: string;
  type: 'treatment' | 'adjustment' | 'maintenance' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  color: string;
  createdAt: string;
}

// Helper function to calculate time ago
function getTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else {
    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
  }
}

export default function HistoryScreen() {
  const { theme, colorScheme } = useAppearance();
  const { token } = useAuth();
  const { selectedDeviceId } = useDeviceSelection();
  
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>('All');

  const loadHistory = useCallback(async () => {
    if (!token || !selectedDeviceId) {
      setHistoryItems([]);
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);
      const response = await getControlHistory(selectedDeviceId, token);
      
      if (response.success && response.data?.history) {
        const items: HistoryItem[] = response.data.history.map((item: ControlHistoryItem) => {
          // Handle notification type
          if (item.type === 'notification') {
            const notificationType = (item as any).notification_type || 'alert';
            const icon = notificationType === 'auto_algae_trigger' ? 'calendar-outline' :
                        notificationType === 'algae_cleaning_complete' ? 'checkmark-circle' :
                        notificationType === 'control_started' ? 'play-circle' :
                        notificationType === 'control_completed' ? 'checkmark-done-circle' :
                        notificationType === 'control_progress' ? 'time' :
                        'notifications';
            
            const color = notificationType === 'auto_algae_trigger' ? theme.warning || theme.primary :
                         notificationType === 'algae_cleaning_complete' ? theme.success :
                         notificationType === 'control_started' ? theme.info :
                         notificationType === 'control_completed' ? theme.success :
                         notificationType === 'control_progress' ? theme.primary :
                         theme.warning || theme.primary;
            
            return {
              id: item.id,
              type: 'alert' as const,
              title: item.title,
              description: item.description,
              timestamp: getTimeAgo(item.timestamp || item.created_at),
              icon,
              color,
              createdAt: item.timestamp || item.created_at,
            };
          }
          
          const historyType = item.type === 'algae' ? 'treatment' : 
                             item.type === 'ph' || item.type === 'ec' ? 'adjustment' : 
                             'maintenance';
          
          const icon = item.type === 'algae' ? 'flask' :
                      item.type === 'ph' ? 'water' :
                      item.type === 'ec' ? 'leaf' : 'settings';
          
          const color = item.type === 'algae' ? theme.error :
                       item.type === 'ph' ? theme.info :
                       item.type === 'ec' ? theme.success : theme.primary;

          return {
            id: item.id,
            type: historyType,
            title: item.title,
            description: item.description,
            timestamp: getTimeAgo(item.timestamp || item.created_at),
            icon,
            color,
            createdAt: item.timestamp || item.created_at,
          };
        });

        setHistoryItems(items);
      } else {
        setHistoryItems([]);
      }
    } catch (error) {
      console.error('Error loading history:', error);
      setHistoryItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, selectedDeviceId, theme]);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory])
  );

  const onRefresh = () => {
    void loadHistory();
  };

  const filteredItems = activeFilter === 'All' 
    ? historyItems 
    : historyItems.filter(item => {
        if (activeFilter === 'Treatments') return item.type === 'treatment';
        if (activeFilter === 'Adjustments') return item.type === 'adjustment';
        if (activeFilter === 'Maintenance') return item.type === 'maintenance';
        if (activeFilter === 'Alerts') return item.type === 'alert';
        return true;
      });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundSecondary }} edges={['bottom']}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text, marginBottom: 8 }}>
            History
          </Text>
          <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 24 }}>
            View past activities and system events
          </Text>

          {/* Filter Buttons */}
          <View style={{ flexDirection: 'row', marginBottom: 16, flexWrap: 'wrap' }}>
            {(['All', 'Treatments', 'Adjustments', 'Maintenance', 'Alerts'] as HistoryFilter[]).map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  style={{
                    backgroundColor: isActive ? theme.primary : theme.background,
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                    marginRight: 8,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: isActive ? theme.primary : theme.border,
                  }}
                >
                  <Text style={{ 
                    fontSize: 14, 
                    fontWeight: isActive ? '600' : '500', 
                    color: isActive ? '#ffffff' : theme.text 
                  }}>
                    {filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Loading State */}
          {loading && (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          )}

          {/* Empty State */}
          {!loading && filteredItems.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="time-outline" size={64} color={theme.textTertiary} style={{ marginBottom: 16 }} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 8 }}>
                No History Available
              </Text>
              <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: 'center' }}>
                {selectedDeviceId 
                  ? 'Control operations will appear here once they occur.'
                  : 'Please select a device to view its history.'}
              </Text>
            </View>
          )}

          {/* History Timeline */}
          {!loading && filteredItems.length > 0 && (
            <View>
              {filteredItems.map((item, index) => (
              <View key={item.id} style={{ flexDirection: 'row', marginBottom: 16 }}>
                {/* Timeline Line */}
                <View style={{ alignItems: 'center', marginRight: 12 }}>
                  <View 
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: item.color + '20',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  {index < historyItems.length - 1 && (
                    <View 
                      style={{
                        width: 2,
                        flex: 1,
                        backgroundColor: theme.border,
                        minHeight: 40,
                      }}
                    />
                  )}
                </View>

                {/* Content */}
                <View style={{ flex: 1, paddingBottom: 16 }}>
                  <View
                    style={{
                      backgroundColor: theme.background,
                      borderRadius: 12,
                      padding: 16,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                      elevation: 2,
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 4 }}>
                      {item.title}
                    </Text>
                    <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 8 }}>
                      {item.description}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.textTertiary }}>
                      {item.timestamp}
                    </Text>
                  </View>
                </View>
              </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

