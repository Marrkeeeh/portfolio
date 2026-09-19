import DeviceSelector from "@/components/devices/DeviceSelector";
import { SupplyCard } from "@/components/supplies/SupplyCard";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useDeviceMonitoring } from "@/contexts/DeviceMonitoringContext";
import "@/global.css";
import { useDeviceSelector } from "@/hooks/useDeviceSelector";
import { useSupplies } from "@/hooks/useSupplies";
import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function InventoryScreen() {
  const { theme, colorScheme } = useAppearance();
  const { supplies, loading, history, refresh, applyRemoteStatuses } = useSupplies();
  const { telemetry } = useDeviceMonitoring();
  const {
    selectorDevices,
    selectedDeviceId,
    loadingDevices: loadingDevicesForSelector,
    setSelectedDeviceId,
    reloadDevices,
  } = useDeviceSelector();

  const filteredSupplies = selectedDeviceId
    ? supplies.filter((s) => s.smart_device_id === selectedDeviceId)
    : supplies;

  const filteredHistory = selectedDeviceId
    ? history.filter((h) => h.smart_device_id === selectedDeviceId)
    : history;

  const handleSelectDevice = (id: number) => {
    setSelectedDeviceId(id);
    void refresh();
  };

  const [refreshing, setRefreshing] = React.useState(false);

  const handlePullToRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refresh(), reloadDevices()]);
    } finally {
      setRefreshing(false);
    }
  };

  // Apply realtime supply status updates from shared DeviceMonitoringContext
  React.useEffect(() => {
    if (!selectedDeviceId || !telemetry || !telemetry.supplies) {
      return;
    }

    const suppliesChanges = telemetry.supplies as Record<string, any> | undefined;
    if (!suppliesChanges) {
      return;
    }

    applyRemoteStatuses(selectedDeviceId, suppliesChanges as any);
  }, [selectedDeviceId, telemetry, applyRemoteStatuses]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}
      edges={["bottom"]}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullToRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: theme.text,
              marginBottom: 4,
            }}
          >
            Supplies Monitoring
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: theme.textSecondary,
              marginBottom: 20,
            }}
          >
            Track the status of fixed system supplies for your LettuceGrow setup.
          </Text>

          {(loading || loadingDevicesForSelector) && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={{ marginLeft: 8, fontSize: 13, color: theme.textSecondary }}>
                Loading supplies...
              </Text>
            </View>
          )}

          {/* Device Selector (only shows when 2+ devices) */}
          {selectorDevices.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <DeviceSelector
                theme={theme}
                colorScheme={colorScheme}
                devices={selectorDevices}
                selectedDeviceId={selectedDeviceId}
                onSelectDevice={handleSelectDevice}
              />
            </View>
          )}

          {/* Supplies Grid */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginHorizontal: -6,
              marginBottom: 24,
            }}
          >
            {filteredSupplies.map((supply) => (
              <SupplyCard
                key={supply.id}
                theme={theme}
                colorScheme={colorScheme}
                supply={supply}
              />
            ))}
          </View>

          {/* Recent Usage Section */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: theme.text,
              marginBottom: 12,
            }}
          >
            Recent Usage
          </Text>

          <View
            style={{
              backgroundColor: theme.background,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 2,
              minHeight: 80,
            }}
          >
            {filteredHistory.length === 0 ? (
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 16,
                }}
              >
                <Text style={{ fontSize: 14, color: theme.textTertiary }}>
                  No usage history available
                </Text>
              </View>
            ) : (
              filteredHistory.slice(0, 6).map((entry) => {
                const label = entry.supply?.display_name ?? "Supply";
                const deviceId = entry.smart_device_id;
                const time = new Date(entry.created_at).toLocaleString();

                const toLabel = entry.to_status === "in_stock" ? "In Stock" : "Needs Refill";
                const fromLabel = entry.from_status
                  ? entry.from_status === "in_stock"
                    ? "In Stock"
                    : "Needs Refill"
                  : "";

                return (
                  <View
                    key={entry.id}
                    style={{
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: theme.text,
                      }}
                    >
                      {label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: theme.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      {fromLabel
                        ? `${fromLabel} → ${toLabel}`
                        : `Status set to ${toLabel}`}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: theme.textTertiary,
                        marginTop: 2,
                      }}
                    >
                      Device #{deviceId} · {time}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

