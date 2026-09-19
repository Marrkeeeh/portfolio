import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

type HomeDeviceConnectionCardProps = {
  theme: any;
  colorScheme: string | null | undefined;
  onAddDevice: () => void;
};

export default function HomeDeviceConnectionCard({
  theme,
  colorScheme,
  onAddDevice,
}: HomeDeviceConnectionCardProps) {
  return (
    <View style={{ padding: 6, marginBottom: 16 }}>
      <View
        style={{
          backgroundColor: colorScheme === "dark" ? "#0f172a" : "#e0f2fe",
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: colorScheme === "dark" ? "#1f2937" : "#bfdbfe",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 6,
          elevation: 4,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colorScheme === "dark" ? "#1e293b" : "#bfdbfe",
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
          }}
        >
          <Ionicons name="hardware-chip-outline" size={24} color={theme.info} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: theme.text,
              marginBottom: 4,
            }}
          >
            No Device Connected
          </Text>
          <Text style={{ fontSize: 14, color: theme.textSecondary }}>
            Connect a device to enable real-time monitoring
          </Text>
        </View>
        <TouchableOpacity
          onPress={onAddDevice}
          style={{
            backgroundColor: theme.info,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            alignItems: "center",
            minWidth: 100,
          }}
        >
          <Ionicons name="add" size={20} color="#ffffff" style={{ marginBottom: 4 }} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#ffffff",
            }}
          >
            Add Device
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
