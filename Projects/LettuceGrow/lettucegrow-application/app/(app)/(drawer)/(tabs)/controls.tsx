import { ControlGroupCard } from "@/components/controls/ControlGroupCard";
import DeviceSelector from "@/components/devices/DeviceSelector";
import HomeDeviceConnectionCard from "@/components/home/HomeDeviceConnectionCard";
import { Button } from "@/components/ui";
import { useAppearance } from "@/contexts/AppearanceContext";
import "@/global.css";
import { useDeviceControls } from "@/hooks/useDeviceControls";
import type { ControlGroupKey } from "@/services/deviceControlsService";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CONTROL_GROUP_KEYS: ControlGroupKey[] = [
  "ph_control",
  "ec_control",
  "algae_control",
  "mixer",
];

export default function ControlsScreen() {
  const { theme, colorScheme } = useAppearance();
  const {
    devices,
    selectorDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    controls,
    loadingDevices,
    savingKey,
    wifiResetting,
    requestWifiReset,
    toggleGroupMode,
    toggleOnOff,
  } = useDeviceControls();

  const hasDevices = selectorDevices.length > 0;
  const hasSelectedDevice =
    !!selectedDeviceId && selectorDevices.some((d) => d.id === selectedDeviceId);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);
  const wifiData: any = selectedDevice?.wifi_data ?? null;

  const wifiSsid = wifiData?.ssid ?? "Unknown network";
  const wifiConnected: boolean | null =
    typeof wifiData?.connected === "boolean" ? wifiData.connected : null;

  const rawSignal: number | null =
    typeof wifiData?.signal_strength === "number"
      ? wifiData.signal_strength
      : typeof wifiData?.rssi === "number"
        ? wifiData.rssi
        : null;

  const wifiRssi = typeof rawSignal === "number" ? `${rawSignal} dBm` : null;

  const wifiStatusText =
    wifiConnected === true
      ? "Connected"
      : wifiConnected === false
        ? "Disconnected"
        : wifiData
          ? "Reported"
          : "No Wi-Fi data yet";

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}
      edges={["bottom"]}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: theme.text,
              marginBottom: 16,
            }}
          >
            System Controls
          </Text>

          {hasDevices ? (
            <DeviceSelector
              theme={theme}
              colorScheme={colorScheme}
              devices={selectorDevices}
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

          {loadingDevices && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
                marginTop: 4,
              }}
            >
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={{ marginLeft: 8, fontSize: 13, color: theme.textSecondary }}>
                Loading devices...
              </Text>
            </View>
          )}

          {hasSelectedDevice && (
            <View
              style={{
                backgroundColor: theme.background,
                borderRadius: 16,
                padding: 14,
                marginTop: 12,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: theme.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor:
                        wifiRssi || wifiStatusText !== "No Wi-Fi data yet"
                          ? "rgba(34,197,94,0.16)"
                          : "rgba(148,163,184,0.14)",
                    }}
                  >
                    <Ionicons
                      name="wifi-outline"
                      size={18}
                      color={
                        wifiRssi || wifiStatusText !== "No Wi-Fi data yet"
                          ? theme.success
                          : theme.textSecondary
                      }
                    />
                  </View>
                  <View style={{ marginLeft: 10 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: theme.text,
                        marginBottom: 2,
                      }}
                    >
                      Wi-Fi
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                      {wifiSsid}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor:
                      wifiRssi || wifiStatusText !== "No Wi-Fi data yet"
                        ? "rgba(34,197,94,0.16)"
                        : "rgba(148,163,184,0.16)",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color:
                        wifiRssi || wifiStatusText !== "No Wi-Fi data yet"
                          ? theme.success
                          : theme.textSecondary,
                    }}
                  >
                    {wifiRssi ? "Good signal" : wifiStatusText}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Button
                  title={wifiResetting ? "Resetting Wi-Fi..." : "Reset Wi-Fi"}
                  variant="primary"
                  size="medium"
                  icon="refresh-outline"
                  loading={wifiResetting}
                  onPress={() => {
                    void requestWifiReset();
                  }}
                  containerStyle={{ marginTop: 4, alignSelf: "flex-start" }}
                />
                <Text
                  style={{
                    fontSize: 11,
                    color: theme.textTertiary,
                    marginLeft: 12,
                    flex: 1,
                  }}
                >
                  ESP32 will reset Wi-Fi on the next poll.
                </Text>
              </View>
            </View>
          )}

          {hasSelectedDevice &&
            CONTROL_GROUP_KEYS.map((groupKey) => (
              <ControlGroupCard
                key={groupKey}
                theme={theme}
                groupKey={groupKey}
                controls={controls}
                savingKey={savingKey}
                onToggleGroupMode={toggleGroupMode}
                onToggleOnOff={toggleOnOff}
              />
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
