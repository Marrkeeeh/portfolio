import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export type DeviceSelectorOption = {
  id: number;
  name: string;
  deviceId: string;
};

type DeviceSelectorProps = {
  theme: any;
  colorScheme: string | null | undefined;
  devices: DeviceSelectorOption[];
  selectedDeviceId: number | null;
  onSelectDevice: (id: number) => void;
};

export default function DeviceSelector({
  theme,
  colorScheme,
  devices,
  selectedDeviceId,
  onSelectDevice,
}: DeviceSelectorProps) {
  if (!devices || devices.length < 2) {
    // No selector when fewer than 2 devices
    return null;
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "500",
          color: theme.textSecondary,
          marginBottom: 8,
        }}
      >
        Monitoring device
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 2 }}
      >
        {devices.map((device) => {
          const isSelected = device.id === selectedDeviceId;

          return (
            <TouchableOpacity
              key={device.id}
              onPress={() => onSelectDevice(device.id)}
              activeOpacity={0.85}
              style={{ marginRight: 8 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  backgroundColor: isSelected
                    ? theme.primary
                    : colorScheme === "dark"
                    ? "#020617"
                    : theme.background,
                  borderWidth: 1,
                  borderColor: isSelected ? theme.primary : theme.border,
                }}
              >
                <View>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: isSelected ? "#ffffff" : theme.text,
                    }}
                  >
                    {device.name || device.deviceId}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: isSelected ? "#e5e7eb" : theme.textSecondary,
                    }}
                  >
                    {device.deviceId}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
