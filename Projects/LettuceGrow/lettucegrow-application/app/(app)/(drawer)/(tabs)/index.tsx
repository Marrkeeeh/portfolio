import DeviceSelector, { type DeviceSelectorOption } from "@/components/devices/DeviceSelector";
import HomeAlgaeMitigation from "@/components/home/HomeAlgaeMitigation";
import HomeDeviceConnectionCard from "@/components/home/HomeDeviceConnectionCard";
import HomeSensorReadings from "@/components/home/HomeSensorReadings";
import HomeWaterQuality from "@/components/home/HomeWaterQuality";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDeviceMonitoring } from "@/contexts/DeviceMonitoringContext";
import { useDeviceSelection } from "@/contexts/DeviceSelectionContext";
import "@/global.css";
import {
  buildDashboardSensorData,
  INITIAL_DASHBOARD_SENSOR_DATA,
  mergeSensorValues,
} from "@/utils/sensorThresholds";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getDeviceById, getDevicesForUser } from "../../../../services/deviceService";
import { getSensorEvaluation } from "../../../../services/sensorEvaluationService";
import { getSuppliesForUser } from "../../../../services/suppliesService";

const initialWaterQuality = {
  waterLevel: 73,
};

export default function HomeScreen() {
  const { theme, colorScheme } = useAppearance();
  const { token } = useAuth();
  const { selectedDeviceId, setSelectedDeviceId } = useDeviceSelection();
  const { telemetry } = useDeviceMonitoring();

  const [waterQuality, setWaterQuality] = useState(initialWaterQuality);
  const [sensorData, setSensorData] = useState(INITIAL_DASHBOARD_SENSOR_DATA);
  const [sensorLoading, setSensorLoading] = useState(false);
  const [hasTelemetry, setHasTelemetry] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [devices, setDevices] = useState<DeviceSelectorOption[]>([]);
  const [algaeMitigation, setAlgaeMitigation] = useState<{
    lastTreatment: string | null;
    nextScheduled: string | null;
    daysUntilNext: number | null;
    isOverdue: boolean;
    progress: number;
  } | null>(null);

  const applySensorEvaluation = useCallback(
    async (deviceId: number) => {
      if (!token) {
        return;
      }

      try {
        const response = await getSensorEvaluation(deviceId, token);

        if (!response.success) {
          return;
        }

        setSensorData((prev) =>
          buildDashboardSensorData(
            {
              pH: prev.pH.value,
              EC: prev.EC.value,
              temperature: prev.temperature.value,
              dissolvedO2: prev.dissolvedO2.value,
            },
            response.data?.sensor_evaluation ?? null,
          ),
        );
      } catch {
        // keep existing thresholds
      }
    },
    [token],
  );

  const calculateAlgaeMitigation = useCallback((device: any) => {
    if (!device?.settings) {
      setAlgaeMitigation(null);
      return;
    }

    const settings = device.settings;
    const lastTreatmentDate = settings.last_algae_treatment;
    const TREATMENT_INTERVAL_DAYS = 7;

    if (!lastTreatmentDate) {
      const deviceCreatedAt = device.created_at ? new Date(device.created_at) : new Date();
      const daysSinceCreation = Math.floor(
        (Date.now() - deviceCreatedAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysSinceCreation >= TREATMENT_INTERVAL_DAYS) {
        setAlgaeMitigation({
          lastTreatment: null,
          nextScheduled: null,
          daysUntilNext: null,
          isOverdue: true,
          progress: 100,
        });
      } else {
        const nextDate = new Date(deviceCreatedAt);
        nextDate.setDate(nextDate.getDate() + TREATMENT_INTERVAL_DAYS);
        setAlgaeMitigation({
          lastTreatment: null,
          nextScheduled: nextDate.toLocaleDateString(),
          daysUntilNext: TREATMENT_INTERVAL_DAYS - daysSinceCreation,
          isOverdue: false,
          progress: (daysSinceCreation / TREATMENT_INTERVAL_DAYS) * 100,
        });
      }
      return;
    }

    try {
      const lastTreatment = new Date(lastTreatmentDate);
      const now = new Date();
      const daysSinceTreatment = Math.floor(
        (now.getTime() - lastTreatment.getTime()) / (1000 * 60 * 60 * 24),
      );

      const nextTreatmentDate = new Date(lastTreatment);
      nextTreatmentDate.setDate(nextTreatmentDate.getDate() + TREATMENT_INTERVAL_DAYS);

      const daysUntilNext = Math.max(0, TREATMENT_INTERVAL_DAYS - daysSinceTreatment);
      const isOverdue = daysSinceTreatment >= TREATMENT_INTERVAL_DAYS;
      const progress = Math.min(100, (daysSinceTreatment / TREATMENT_INTERVAL_DAYS) * 100);

      const formatDate = (date: Date) => {
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return date.toLocaleDateString();
      };

      setAlgaeMitigation({
        lastTreatment: formatDate(lastTreatment),
        nextScheduled: nextTreatmentDate.toLocaleDateString(),
        daysUntilNext: isOverdue ? null : daysUntilNext,
        isOverdue,
        progress,
      });
    } catch (error) {
      console.error("Error calculating algae mitigation:", error);
      setAlgaeMitigation(null);
    }
  }, []);

  useEffect(() => {
    if (!telemetry) {
      return;
    }

    setHasTelemetry(true);

    setSensorData((prev) =>
      mergeSensorValues(prev, {
        ...(typeof telemetry.ph_level === "number" ? { pH: telemetry.ph_level } : {}),
        ...(typeof telemetry.ec_level === "number" ? { EC: telemetry.ec_level } : {}),
        ...(typeof telemetry.temperature === "number"
          ? { temperature: telemetry.temperature }
          : {}),
        ...(typeof telemetry.do_data === "number" ? { dissolvedO2: telemetry.do_data } : {}),
      }),
    );

    const suppliesChanges = telemetry.supplies as Record<string, any> | undefined;
    if (suppliesChanges && typeof suppliesChanges.water_tank === "string") {
      const status = suppliesChanges.water_tank;
      setWaterQuality((prev) => ({
        ...prev,
        waterLevel: status === "in_stock" ? 100 : 0,
      }));
    }
  }, [telemetry]);

  useFocusEffect(
    React.useCallback(() => {
      if (!token) {
        setDevices([]);
        setSelectedDeviceId(null);
        setAlgaeMitigation(null);
        return;
      }

      let cancelled = false;

      const loadDevices = async () => {
        try {
          const response = await getDevicesForUser(token);

          if (cancelled) {
            return;
          }

          if (response.success && response.data?.devices) {
            const normalized: DeviceSelectorOption[] = response.data.devices.map((device) => ({
              id: device.id,
              name: device.name || device.device_id || `Device ${device.id}`,
              deviceId: device.device_id,
            }));

            setDevices(normalized);

            setSelectedDeviceId((prev) => {
              if (prev && normalized.some((d) => d.id === prev)) {
                return prev;
              }
              return normalized.length > 0 ? normalized[0].id : null;
            });
          } else {
            setDevices([]);
            setSelectedDeviceId(null);
          }
        } catch {
          if (!cancelled) {
            setDevices([]);
            setSelectedDeviceId(null);
          }
        }
      };

      void loadDevices();

      if (selectedDeviceId) {
        void applySensorEvaluation(selectedDeviceId);
      }

      return () => {
        cancelled = true;
      };
    }, [token, setSelectedDeviceId, selectedDeviceId, applySensorEvaluation]),
  );

  useEffect(() => {
    if (!selectedDeviceId) {
      return;
    }

    void applySensorEvaluation(selectedDeviceId);
  }, [selectedDeviceId, applySensorEvaluation]);

  const loadTelemetry = useCallback(async () => {
    if (!token || !selectedDeviceId) {
      setHasTelemetry(false);
      return;
    }

    setSensorLoading(true);
    try {
      const response = await getDeviceById(selectedDeviceId, token);

      const device = response.data?.device;
      const deviceTelemetry = device?.settings?.telemetry;

      if (device) {
        calculateAlgaeMitigation(device);
      }

      if (!deviceTelemetry) {
        setHasTelemetry(false);
        return;
      }

      const hasAny =
        deviceTelemetry.ph_level != null ||
        deviceTelemetry.ec_level != null ||
        deviceTelemetry.temperature != null ||
        deviceTelemetry.do_data != null;

      if (!hasAny) {
        setHasTelemetry(false);
        return;
      }

      setSensorData((prev) =>
        mergeSensorValues(prev, {
          ...(typeof deviceTelemetry.ph_level === "number"
            ? { pH: deviceTelemetry.ph_level }
            : {}),
          ...(typeof deviceTelemetry.ec_level === "number"
            ? { EC: deviceTelemetry.ec_level }
            : {}),
          ...(typeof deviceTelemetry.temperature === "number"
            ? { temperature: deviceTelemetry.temperature }
            : {}),
          ...(typeof deviceTelemetry.do_data === "number"
            ? { dissolvedO2: deviceTelemetry.do_data }
            : {}),
        }),
      );

      await applySensorEvaluation(selectedDeviceId);

      try {
        const suppliesResponse = await getSuppliesForUser(token);

        if (suppliesResponse.success && suppliesResponse.data?.supplies) {
          const waterSupply = suppliesResponse.data.supplies.find(
            (s) => s.smart_device_id === selectedDeviceId && s.type === "water_tank",
          );

          if (waterSupply) {
            setWaterQuality((prev) => ({
              ...prev,
              waterLevel: waterSupply.status === "in_stock" ? 100 : 0,
            }));
          }
        }
      } catch {
        // ignore, keep existing waterLevel
      }

      setHasTelemetry(true);
    } catch {
      setHasTelemetry(false);
    } finally {
      setSensorLoading(false);
    }
  }, [token, selectedDeviceId, applySensorEvaluation, calculateAlgaeMitigation]);

  useEffect(() => {
    void loadTelemetry();
  }, [loadTelemetry]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTelemetry();
    setRefreshing(false);
  }, [loadTelemetry]);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) || null;

  const rawWaterLevel = waterQuality.waterLevel;
  const isWaterAvailable =
    typeof rawWaterLevel === "number" ? rawWaterLevel >= 1 : !!rawWaterLevel;
  const waterStatusLabel = isWaterAvailable ? "In Stock" : "Needs Refill";
  const waterStatusColor = isWaterAvailable ? theme.success : theme.error;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundSecondary }} edges={["bottom"]}>
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
          {devices.length === 0 && (
            <HomeDeviceConnectionCard
              theme={theme}
              colorScheme={colorScheme}
              onAddDevice={() => {
                router.push("/(app)/(drawer)/devices");
              }}
            />
          )}

          <DeviceSelector
            theme={theme}
            colorScheme={colorScheme}
            devices={devices}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={setSelectedDeviceId}
          />

          {devices.length > 0 && selectedDeviceId ? (
            hasTelemetry ? (
              <>
                <HomeSensorReadings theme={theme} sensorData={sensorData} />

                <HomeWaterQuality
                  theme={theme}
                  colorScheme={colorScheme}
                  isWaterAvailable={isWaterAvailable}
                  waterStatusLabel={waterStatusLabel}
                  waterStatusColor={waterStatusColor}
                />
              </>
            ) : (
              <View style={{ marginTop: 16 }}>
                <View
                  style={{
                    backgroundColor: theme.background,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: theme.border,
                    flexDirection: "row",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: theme.primary,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Ionicons name="pulse-outline" size={22} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: theme.text,
                        marginBottom: 4,
                      }}
                    >
                      No sensor data yet
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: theme.textSecondary,
                        lineHeight: 18,
                      }}
                    >
                      {sensorLoading
                        ? "Connecting to your device and retrieving the latest telemetry..."
                        : selectedDevice
                          ? `Waiting for the first readings from ${selectedDevice.name}. Make sure the controller is powered and connected to Wi-Fi.`
                          : "Waiting for the first readings from this controller. Make sure it is powered and connected to Wi-Fi."}
                    </Text>
                  </View>
                </View>
              </View>
            )
          ) : null}

          {selectedDeviceId && algaeMitigation && (
            <HomeAlgaeMitigation theme={theme} algaeMitigation={algaeMitigation} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
