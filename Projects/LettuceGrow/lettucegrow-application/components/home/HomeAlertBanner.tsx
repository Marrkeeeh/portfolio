import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

type HomeAlertBannerProps = {
  theme: any;
  colorScheme: string | null | undefined;
  visible: boolean;
  onDismiss: () => void;
  onApplyTreatment: () => void;
};

export default function HomeAlertBanner({
  theme,
  colorScheme,
  visible,
  onDismiss,
  onApplyTreatment,
}: HomeAlertBannerProps) {
  if (!visible) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: colorScheme === "dark" ? "#3f1f1f" : "#fee2e2",
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: theme.error,
        borderWidth: 1,
        borderColor: colorScheme === "dark" ? "#7f1d1d" : "#fecaca",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 4,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 12 }}>
        <Ionicons
          name="warning"
          size={20}
          color={theme.error}
          style={{ marginRight: 8, marginTop: 2 }}
        />
        <Ionicons
          name="settings"
          size={20}
          color={theme.error}
          style={{ marginRight: 8, marginTop: 2 }}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: theme.error,
              marginBottom: 4,
            }}
          >
            Possible Algae Detected
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colorScheme === "dark" ? "#fca5a5" : "#dc2626",
            }}
          >
            Sensor readings suggest possible algae growth. Review your system and apply treatment if needed.
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row" }}>
        <TouchableOpacity
          onPress={onDismiss}
          style={{
            flex: 1,
            backgroundColor: colorScheme === "dark" ? "#4a2525" : "#fecaca",
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 8,
            alignItems: "center",
            marginRight: 8,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: theme.error }}>Dismiss</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onApplyTreatment}
          style={{
            flex: 1,
            backgroundColor: theme.error,
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 8,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
          }}
        >
          <Ionicons name="flask" size={16} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#ffffff" }}>
            Apply Treatment
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
