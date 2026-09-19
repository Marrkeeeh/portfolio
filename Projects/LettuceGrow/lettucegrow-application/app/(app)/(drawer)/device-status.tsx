import HomeControlStatus from "@/components/home/HomeControlStatus";
import DeviceSelector from "@/components/devices/DeviceSelector";
import HomeDeviceConnectionCard from "@/components/home/HomeDeviceConnectionCard";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDeviceMonitoring, type ControlStatus } from "@/contexts/DeviceMonitoringContext";
import { useDeviceSelection } from "@/contexts/DeviceSelectionContext";
import "@/global.css";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useState, useCallback } from "react";
import { ScrollView, Text, View, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getDeviceById, getDevicesForUser } from "@/services/deviceService";

type TabType = 'control' | 'sensors' | 'system';

export default function DeviceStatusScreen() {
  const { theme, colorScheme } = useAppearance();
  const { token } = useAuth();
  const { selectedDeviceId, setSelectedDeviceId } = useDeviceSelection();
  const { telemetry, controlStatus, hasTelemetry } = useDeviceMonitoring();
  
  const [activeTab, setActiveTab] = useState<TabType>('control');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<any>(null);

  const loadDevices = useCallback(async () => {
    if (!token) {
      setDevices([]);
      setSelectedDeviceId(null);
      return;
    }

    try {
      const response = await getDevicesForUser(token);
      if (response.success && response.data?.devices) {
        setDevices(response.data.devices);
        setSelectedDeviceId((prev) => {
          if (prev && response.data.devices.some((d: any) => d.id === prev)) {
            return prev;
          }
          return response.data.devices.length > 0 ? response.data.devices[0].id : null;
        });
      } else {
        setDevices([]);
        setSelectedDeviceId(null);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
      setDevices([]);
    }
  }, [token, setSelectedDeviceId]);

  const loadDeviceData = useCallback(async () => {
    if (!token || !selectedDeviceId) {
      setDeviceData(null);
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);
      const response = await getDeviceById(selectedDeviceId, token);
      if (response.success && response.data?.device) {
        setDeviceData(response.data.device);
      }
    } catch (error) {
      console.error('Error loading device data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, selectedDeviceId]);

  useFocusEffect(
    useCallback(() => {
      loadDevices();
    }, [loadDevices])
  );

  useFocusEffect(
    useCallback(() => {
      loadDeviceData();
    }, [loadDeviceData])
  );

  const onRefresh = () => {
    loadDeviceData();
    loadDevices();
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'control', label: 'Control Status', icon: 'settings' },
    { id: 'sensors', label: 'Sensors', icon: 'pulse' },
    { id: 'system', label: 'System Info', icon: 'information-circle' },
  ];

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);
  const wifiData: any = selectedDevice?.wifi_data ?? null;

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
            Device Status
          </Text>
          <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 24 }}>
            Real-time device control and system information
          </Text>

          {/* Device Selector */}
          {devices.length > 0 ? (
            <DeviceSelector
              theme={theme}
              colorScheme={colorScheme}
              devices={devices.map((d) => ({
                id: d.id,
                name: d.name || d.device_id || `Device ${d.id}`,
                deviceId: d.device_id,
              }))}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={setSelectedDeviceId}
            />
          ) : (
            <HomeDeviceConnectionCard
              theme={theme}
              colorScheme={colorScheme}
              onAddDevice={() => {
                router.push("/(app)/(drawer)/devices");
              }}
            />
          )}

          {loading && selectedDeviceId && (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          )}

          {selectedDeviceId && !loading && (
            <>
              {/* Tabs */}
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: theme.background,
                  borderRadius: 12,
                  padding: 4,
                  marginTop: 24,
                  marginBottom: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      onPress={() => setActiveTab(tab.id)}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        paddingVertical: 10,
                        borderRadius: 8,
                        backgroundColor: isActive ? theme.primary : 'transparent',
                      }}
                    >
                      <Ionicons
                        name={tab.icon as any}
                        size={20}
                        color={isActive ? '#ffffff' : theme.textSecondary}
                        style={{ marginBottom: 4 }}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: isActive ? '600' : '500',
                          color: isActive ? '#ffffff' : theme.textSecondary,
                        }}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Tab Content */}
              {activeTab === 'control' && (
                <View>
                  {controlStatus && controlStatus.type !== 'idle' ? (
                    <HomeControlStatus controlStatus={controlStatus} />
                  ) : (
                    <View
                      style={{
                        backgroundColor: theme.background,
                        borderRadius: 12,
                        padding: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 150,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 2,
                      }}
                    >
                      <Ionicons name="checkmark-circle-outline" size={48} color={theme.success} style={{ marginBottom: 12 }} />
                      <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 4 }}>
                        System Idle
                      </Text>
                      <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: 'center' }}>
                        No active control operations. All parameters are optimal.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {activeTab === 'sensors' && (
                <View>
                  {hasTelemetry && telemetry ? (
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
                      <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 16 }}>
                        Current Sensor Readings
                      </Text>
                      
                      {telemetry.ph_level != null && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.backgroundSecondary }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="water" size={20} color={theme.primary} style={{ marginRight: 12 }} />
                            <Text style={{ fontSize: 14, color: theme.textSecondary }}>pH Level</Text>
                          </View>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                            {telemetry.ph_level.toFixed(2)}
                          </Text>
                        </View>
                      )}

                      {telemetry.ec_level != null && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.backgroundSecondary }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="leaf" size={20} color={theme.primary} style={{ marginRight: 12 }} />
                            <Text style={{ fontSize: 14, color: theme.textSecondary }}>EC Level</Text>
                          </View>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                            {telemetry.ec_level.toFixed(2)} mS/cm
                          </Text>
                        </View>
                      )}

                      {telemetry.temperature != null && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.backgroundSecondary }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="thermometer" size={20} color={theme.primary} style={{ marginRight: 12 }} />
                            <Text style={{ fontSize: 14, color: theme.textSecondary }}>Temperature</Text>
                          </View>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                            {telemetry.temperature.toFixed(1)}°C
                          </Text>
                        </View>
                      )}

                      {telemetry.do_data != null && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.backgroundSecondary }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="airplane" size={20} color={theme.primary} style={{ marginRight: 12 }} />
                            <Text style={{ fontSize: 14, color: theme.textSecondary }}>Dissolved Oxygen</Text>
                          </View>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                            {telemetry.do_data.toFixed(2)} mg/L
                          </Text>
                        </View>
                      )}

                      {telemetry.turbidity != null && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="eye" size={20} color={theme.primary} style={{ marginRight: 12 }} />
                            <Text style={{ fontSize: 14, color: theme.textSecondary }}>Turbidity</Text>
                          </View>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                            {telemetry.turbidity.toFixed(2)} NTU
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View
                      style={{
                        backgroundColor: theme.background,
                        borderRadius: 12,
                        padding: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 150,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 2,
                      }}
                    >
                      <Ionicons name="pulse-outline" size={48} color={theme.textTertiary} style={{ marginBottom: 12 }} />
                      <Text style={{ fontSize: 14, color: theme.textTertiary, textAlign: 'center' }}>
                        No sensor data available
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {activeTab === 'system' && (
                <View>
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
                    <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 16 }}>
                      System Information
                    </Text>

                    {/* Device Status */}
                    {selectedDevice && (
                      <>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.backgroundSecondary }}>
                          <Text style={{ fontSize: 14, color: theme.textSecondary }}>Device Status</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: selectedDevice.status === 'active' ? theme.success : theme.error,
                                marginRight: 6,
                              }}
                            />
                            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text, textTransform: 'capitalize' }}>
                              {selectedDevice.status || 'Unknown'}
                            </Text>
                          </View>
                        </View>

                        {/* WiFi Information */}
                        {wifiData && (
                          <>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.backgroundSecondary }}>
                              <Text style={{ fontSize: 14, color: theme.textSecondary }}>WiFi Network</Text>
                              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>
                                {wifiData.ssid || 'Unknown'}
                              </Text>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.backgroundSecondary }}>
                              <Text style={{ fontSize: 14, color: theme.textSecondary }}>WiFi Status</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: wifiData.connected ? theme.success : theme.error,
                                    marginRight: 6,
                                  }}
                                />
                                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>
                                  {wifiData.connected ? 'Connected' : 'Disconnected'}
                                </Text>
                              </View>
                            </View>

                            {wifiData.signal_strength != null && (
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.backgroundSecondary }}>
                                <Text style={{ fontSize: 14, color: theme.textSecondary }}>Signal Strength</Text>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>
                                  {wifiData.signal_strength} dBm
                                </Text>
                              </View>
                            )}
                          </>
                        )}

                        {/* Device Installation Date */}
                        {selectedDevice.date_installed && (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 }}>
                            <Text style={{ fontSize: 14, color: theme.textSecondary }}>Installed</Text>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>
                              {new Date(selectedDevice.date_installed).toLocaleDateString()}
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

