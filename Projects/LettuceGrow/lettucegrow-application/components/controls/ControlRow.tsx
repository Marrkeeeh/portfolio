import {
    CONTROL_LABELS,
    type ControlKey,
    type ControlState,
} from "@/services/deviceControlsService";
import React from "react";
import { Switch, Text, TouchableOpacity, View } from "react-native";

type ControlRowProps = {
  theme: any;
  controlKey: ControlKey;
  state: ControlState;
  saving: boolean;
  onToggleMode: (key: ControlKey, isManual: boolean) => void;
  onToggleOnOff: (key: ControlKey) => void;
  showModeToggle?: boolean;
};

export function ControlRow({
  theme,
  controlKey,
  state,
  saving,
  onToggleMode,
  onToggleOnOff,
  showModeToggle = true,
}: ControlRowProps) {
  const isManual = state.mode === "manual";

  return (
    <View style={{ marginBottom: 12 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: theme.text,
              marginBottom: 2,
            }}
          >
            {CONTROL_LABELS[controlKey]}
          </Text>
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
            {state.isOn ? "On" : "Off"}
          </Text>
        </View>
        {showModeToggle && (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 11, color: theme.textSecondary, marginRight: 4 }}>
              Auto
            </Text>
            <Switch
              value={isManual}
              onValueChange={(value) => onToggleMode(controlKey, value)}
              trackColor={{ false: theme.backgroundSecondary, true: theme.warning }}
              thumbColor="#ffffff"
            />
            <Text style={{ fontSize: 11, color: theme.textSecondary, marginLeft: 4 }}>
              Manual
            </Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        onPress={() => onToggleOnOff(controlKey)}
        disabled={saving}
        style={{
          backgroundColor: state.isOn ? theme.success : theme.backgroundSecondary,
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: 8,
          alignItems: "center",
          opacity: saving ? 0.7 : 1,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: state.isOn ? "#ffffff" : theme.text,
          }}
        >
          {state.isOn ? "Turn Off" : "Turn On"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
