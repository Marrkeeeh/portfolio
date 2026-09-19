import { Button, Input, KeyboardAwareScrollView, Logo } from "@/components/ui";
import React from "react";
import { Text, View } from "react-native";
import type { DeviceListItem } from "./types";

type DevicesEditFormProps = {
  theme: any;
  editingDevice: DeviceListItem;
  editName: string;
  editLocation: string;
  isSaving: boolean;
  onChangeName: (value: string) => void;
  onChangeLocation: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function DevicesEditForm({
  theme,
  editingDevice,
  editName,
  editLocation,
  isSaving,
  onChangeName,
  onChangeLocation,
  onSave,
  onCancel,
}: DevicesEditFormProps) {
  return (
    <KeyboardAwareScrollView>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, flex: 1 }}>
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <Logo size="large" />
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: theme.text,
              marginTop: 12,
              marginBottom: 4,
              textAlign: "center",
            }}
          >
            Edit Device
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.textSecondary,
              textAlign: "center",
            }}
          >
            Update the name or location for your device
          </Text>
        </View>

        <View
          style={{
            backgroundColor: theme.background,
            borderRadius: 20,
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 4,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: theme.borderLight,
          }}
        >
          <Input
            label="Device Name"
            value={editName}
            onChangeText={onChangeName}
            placeholder="e.g., LettuceGrow-Sensor-001"
            leftIcon="hardware-chip-outline"
          />

          <Input
            label="Location (optional)"
            value={editLocation}
            onChangeText={onChangeLocation}
            placeholder="e.g., Greenhouse A - Rack 1"
            leftIcon="location-outline"
          />

          <Input
            label="Device ID"
            value={editingDevice.deviceId}
            editable={false}
            leftIcon="finger-print-outline"
          />

          <Button
            title="Save Changes"
            variant="primary"
            size="medium"
            icon="save-outline"
            fullWidth
            loading={isSaving}
            onPress={onSave}
            containerStyle={{ marginTop: 16 }}
          />

          <Button
            title="Cancel"
            variant="ghost"
            size="medium"
            icon="arrow-back-outline"
            fullWidth
            onPress={onCancel}
            containerStyle={{ marginTop: 8 }}
          />
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}
