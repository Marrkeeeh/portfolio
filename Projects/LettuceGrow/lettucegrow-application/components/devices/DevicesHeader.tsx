import { Button } from "@/components/ui";
import React from "react";
import { Text, View } from "react-native";

type DevicesHeaderProps = {
  theme: any;
  colorScheme: string | null | undefined;
  connectedCount: number;
  totalDevices: number;
  offlineCount: number;
  onAddDevice: () => void;
};

export function DevicesHeader({
  theme,
  colorScheme,
  connectedCount,
  totalDevices,
  offlineCount,
  onAddDevice,
}: DevicesHeaderProps) {
  return (
    <View
      style={{
        backgroundColor: colorScheme === "dark" ? "#020617" : "#ffffff",
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.borderLight,
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 4,
        }}
      >
        Devices
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: theme.textSecondary,
          marginBottom: 12,
        }}
      >
        Manage and monitor your connected devices
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <View
          style={{
            flex: 1,
            marginRight: 8,
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderRadius: 999,
            backgroundColor:
              colorScheme === "dark" ? "rgba(34,197,94,0.12)" : "rgba(22,163,74,0.08)",
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: theme.success,
            }}
          >
            Connected
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: theme.text,
            }}
          >
            {connectedCount} / {totalDevices}
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            marginLeft: 8,
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderRadius: 999,
            backgroundColor:
              colorScheme === "dark" ? "rgba(248,113,113,0.12)" : "rgba(248,113,113,0.06)",
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: theme.error,
            }}
          >
            Offline
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: theme.text,
            }}
          >
            {offlineCount}
          </Text>
        </View>
      </View>

      <Button
        title="Add Device"
        variant="primary"
        size="medium"
        icon="add"
        fullWidth
        onPress={onAddDevice}
        containerStyle={{ marginBottom: 0 }}
      />
    </View>
  );
}
