import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type AlgaeMitigation = {
  lastTreatment: string | null;
  nextScheduled: string | null;
  daysUntilNext: number | null;
  isOverdue: boolean;
  progress: number; // 0-100
};

type HomeAlgaeMitigationProps = {
  theme: any;
  algaeMitigation: AlgaeMitigation | null;
};

export default function HomeAlgaeMitigation({
  theme,
  algaeMitigation,
}: HomeAlgaeMitigationProps) {
  const statusColor = useMemo(() => {
    if (!algaeMitigation) return theme.textSecondary;
    if (algaeMitigation.isOverdue) return theme.error;
    if (algaeMitigation.daysUntilNext !== null && algaeMitigation.daysUntilNext <= 2) return theme.warning;
    return theme.success;
  }, [algaeMitigation, theme]);

  const statusText = useMemo(() => {
    if (!algaeMitigation) return "No data";
    if (algaeMitigation.isOverdue) return "Overdue";
    if (algaeMitigation.daysUntilNext === null) return "Scheduled";
    if (algaeMitigation.daysUntilNext === 0) return "Due today";
    if (algaeMitigation.daysUntilNext === 1) return "Due tomorrow";
    return `${algaeMitigation.daysUntilNext} days remaining`;
  }, [algaeMitigation]);

  if (!algaeMitigation) {
    return null;
  }
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
        Algae Mitigation
      </Text>

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
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                Last H₂O₂ Treatment
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons 
                  name={algaeMitigation.isOverdue ? "warning" : "checkmark-circle"} 
                  size={16} 
                  color={statusColor} 
                  style={{ marginRight: 4 }}
                />
                <Text style={{ fontSize: 12, fontWeight: '600', color: statusColor }}>
                  {statusText}
                </Text>
              </View>
            </View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.text,
                marginBottom: 12,
              }}
            >
              {algaeMitigation.lastTreatment || "Never"}
            </Text>
            
            {/* Progress Bar */}
            <View
              style={{
                height: 6,
                backgroundColor: theme.backgroundSecondary,
                borderRadius: 3,
                overflow: "hidden",
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${Math.min(100, Math.max(0, algaeMitigation.progress))}%`,
                  backgroundColor: statusColor,
                  borderRadius: 3,
                }}
              />
            </View>

            {/* Next Scheduled */}
            {algaeMitigation.nextScheduled && (
              <View>
                <Text style={{ fontSize: 12, color: theme.textTertiary, marginBottom: 2 }}>
                  Next Scheduled
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "500", color: theme.textSecondary }}>
                  {algaeMitigation.nextScheduled}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
