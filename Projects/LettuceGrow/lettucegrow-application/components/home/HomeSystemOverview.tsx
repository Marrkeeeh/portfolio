import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

type GrowthCycle = {
  current: number;
  total: number;
};

type HomeSystemOverviewProps = {
  theme: any;
  colorScheme: string | null | undefined;
  systemStatus: string;
  growthCycle: GrowthCycle;
};

export default function HomeSystemOverview({
  theme,
  colorScheme,
  systemStatus,
  growthCycle,
}: HomeSystemOverviewProps) {
  return (
    <View>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 12,
          marginTop: 0,
        }}
      >
        System Overview
      </Text>

      <View style={{ flexDirection: "row", marginHorizontal: -6, marginBottom: 16 }}>
        {/* System Status Card */}
        <View style={{ flex: 1, padding: 6 }}>
          <View
            style={{
              backgroundColor: colorScheme === "dark" ? "#1a3a2a" : "#dcfce7",
              borderRadius: 12,
              padding: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 2,
            }}
          >
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
              System Status
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "700", color: theme.warning }}>
                {systemStatus}
              </Text>
              <Ionicons name="hand-left-outline" size={24} color={theme.warning} />
            </View>
          </View>
        </View>

        {/* Growth Cycle Card */}
        <View style={{ flex: 1, padding: 6 }}>
          <View
            style={{
              backgroundColor: colorScheme === "dark" ? "#020617" : "#e0f2fe",
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: colorScheme === "dark" ? "#1e293b" : "#bfdbfe",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 2,
            }}
          >
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
              Growth Cycle
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "700", color: theme.info }}>
                Day {growthCycle.current}/{growthCycle.total}
              </Text>
              <Ionicons name="leaf-outline" size={24} color={theme.info} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
