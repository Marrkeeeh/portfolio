import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import { DeviceCard } from "./DeviceCard";
import type { DeviceListItem } from "./types";

type DevicesListProps = {
  theme: any;
  colorScheme: string | null | undefined;
  devices: DeviceListItem[];
  devicesLoading: boolean;
  onShowDetails: (device: DeviceListItem) => void;
  onEdit: (device: DeviceListItem) => void;
  onRemove: (device: DeviceListItem) => void;
  onShare?: (device: DeviceListItem) => void;
};

export function DevicesList({
  theme,
  colorScheme,
  devices,
  devicesLoading,
  onShowDetails,
  onEdit,
  onRemove,
  onShare,
}: DevicesListProps) {
  return (
    <View>
      {devicesLoading && devices.length === 0 ? (
        <Text
          style={{
            fontSize: 14,
            color: theme.textSecondary,
          }}
        >
          Loading your devices...
        </Text>
      ) : null}

      {!devicesLoading && devices.length === 0 ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 14,
            borderRadius: 16,
            backgroundColor: colorScheme === "dark" ? "#020617" : "#ffffff",
            borderWidth: 1,
            borderColor: theme.borderLight,
            marginTop: 8,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
              backgroundColor:
                colorScheme === "dark"
                  ? "rgba(148,163,184,0.16)"
                  : "rgba(148,163,184,0.12)",
            }}
          >
            <Ionicons name="hardware-chip-outline" size={20} color={theme.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: theme.text,
                marginBottom: 2,
              }}
            >
              No devices connected yet
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: theme.textTertiary,
              }}
            >
              Tap &quot;Add Device&quot; to connect your first LettuceGrow device.
            </Text>
          </View>
        </View>
      ) : null}

      {devices.map((device) => (
        <DeviceCard
          key={device.id}
          device={device}
          theme={theme}
          colorScheme={colorScheme}
          onShowDetails={onShowDetails}
          onEdit={onEdit}
          onRemove={onRemove}
          onShare={onShare}
        />
      ))}
    </View>
  );
}
