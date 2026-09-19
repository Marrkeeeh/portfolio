import React from "react";
import { Switch, Text, View } from "react-native";

type ControlGroupHeaderProps = {
  theme: any;
  title: string;
  subtitle: string;
  isManual: boolean;
  saving: boolean;
  onToggleMode: (isManual: boolean) => void;
};

export function ControlGroupHeader({
  theme,
  title,
  subtitle,
  isManual,
  saving,
  onToggleMode,
}: ControlGroupHeaderProps) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 4,
        }}
      >
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: theme.text,
              marginBottom: 4,
            }}
          >
            {title}
          </Text>
          <Text style={{ fontSize: 13, color: theme.textSecondary }}>{subtitle}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
          <Text style={{ fontSize: 11, color: theme.textSecondary, marginRight: 4 }}>
            Auto
          </Text>
          <Switch
            value={isManual}
            onValueChange={onToggleMode}
            disabled={saving}
            trackColor={{ false: theme.backgroundSecondary, true: theme.warning }}
            thumbColor="#ffffff"
          />
          <Text style={{ fontSize: 11, color: theme.textSecondary, marginLeft: 4 }}>
            Manual
          </Text>
        </View>
      </View>
      {isManual && (
        <View
          style={{
            backgroundColor: theme.backgroundSecondary,
            padding: 8,
            borderRadius: 6,
            marginTop: 4,
          }}
        >
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
            Manual mode: Individual controls are available below
          </Text>
        </View>
      )}
    </View>
  );
}

