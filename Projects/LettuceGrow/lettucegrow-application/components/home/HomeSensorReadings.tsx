import SemiCircularGauge from "@/components/ui/SemiCircularGauge";
import type { DashboardSensorData } from "@/utils/sensorThresholds";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

type HomeSensorReadingsProps = {
  theme: any;
  sensorData: DashboardSensorData;
};

export default function HomeSensorReadings({ theme, sensorData }: HomeSensorReadingsProps) {
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
        Sensor Readings
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 }}>
        {/* pH Level Card */}
        <View style={{ width: "50%", padding: 6 }}>
          <View
            style={{
              backgroundColor: theme.background,
              borderRadius: 12,
              padding: 16,
              borderLeftWidth: 4,
              borderLeftColor: theme.success,
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
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>pH Level</Text>
              <Ionicons name="pulse-outline" size={20} color={theme.success} />
            </View>
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <SemiCircularGauge
                value={sensorData.pH.value}
                min={4.0}
                max={8.0}
                optimalMin={sensorData.pH.optimalMin}
                optimalMax={sensorData.pH.optimalMax}
                colors={["#ef4444", "#f59e0b", "#10b981", "#3b82f6"]}
                size={100}
              />
            </View>
            <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: "center" }}>
              Optimal: {sensorData.pH.optimal}
            </Text>
          </View>
        </View>

        {/* EC Card */}
        <View style={{ width: "50%", padding: 6 }}>
          <View
            style={{
              backgroundColor: theme.background,
              borderRadius: 12,
              padding: 16,
              borderLeftWidth: 4,
              borderLeftColor: theme.info,
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
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>EC (µS/cm)</Text>
              <Ionicons name="flash-outline" size={20} color={theme.info} />
            </View>
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <SemiCircularGauge
                value={sensorData.EC.value}
                min={0.0}
                max={3.0}
                optimalMin={sensorData.EC.optimalMin}
                optimalMax={sensorData.EC.optimalMax}
                colors={["#ef4444", "#f59e0b", "#10b981", "#3b82f6"]}
                size={100}
              />
            </View>
            <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: "center" }}>
              Optimal: {sensorData.EC.optimal}
            </Text>
          </View>
        </View>

        {/* Temperature Card */}
        <View style={{ width: "50%", padding: 6 }}>
          <View
            style={{
              backgroundColor: theme.background,
              borderRadius: 12,
              padding: 16,
              borderLeftWidth: 4,
              borderLeftColor: theme.warning,
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
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>Temperature</Text>
              <Ionicons name="thermometer-outline" size={20} color={theme.warning} />
            </View>
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <Text style={{ fontSize: 28, fontWeight: "bold", color: theme.text }}>
                {sensorData.temperature.value.toFixed(2)} °C
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>
              Optimal: {sensorData.temperature.optimal}
            </Text>
          </View>
        </View>

        {/* Dissolved O₂ Card */}
        <View style={{ width: "50%", padding: 6 }}>
          <View
            style={{
              backgroundColor: theme.background,
              borderRadius: 12,
              padding: 16,
              borderLeftWidth: 4,
              borderLeftColor: "#a855f7",
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
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>Dissolved O₂</Text>
              <Ionicons name="water-outline" size={20} color="#a855f7" />
            </View>
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: theme.text }}>
                {sensorData.dissolvedO2.value.toFixed(2)} mg/L
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>
              Optimal: {sensorData.dissolvedO2.optimal}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
