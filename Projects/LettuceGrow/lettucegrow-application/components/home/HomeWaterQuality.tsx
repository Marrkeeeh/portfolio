import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

type HomeWaterQualityProps = {
  theme: any;
  colorScheme: string | null | undefined;
  isWaterAvailable: boolean;
  waterStatusLabel: string;
  waterStatusColor: string;
};

export default function HomeWaterQuality({
  theme,
  isWaterAvailable,
  waterStatusLabel,
  waterStatusColor,
}: HomeWaterQualityProps) {
  return (
    <View>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 12,
          marginTop: 8,
        }}
      >
        Water Quality
      </Text>

      <View style={{ marginHorizontal: -6 }}>
        <View style={{ padding: 6 }}>
          <View
            style={{
              backgroundColor: theme.background,
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.border,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 2,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>
                Water Supply
              </Text>
              <Ionicons name="water" size={20} color={theme.info} />
            </View>
            <View>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
                {isWaterAvailable ? "Reservoir OK" : "Refill Needed"}
              </Text>
              <View
                style={{
                  backgroundColor: waterStatusColor + "20",
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  alignSelf: "flex-start",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: waterStatusColor,
                  }}
                >
                  {waterStatusLabel}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
