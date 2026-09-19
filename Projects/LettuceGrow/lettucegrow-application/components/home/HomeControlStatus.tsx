import { useAppearance } from "@/contexts/AppearanceContext";
import { ControlStatus } from "@/contexts/DeviceMonitoringContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

interface HomeControlStatusProps {
  controlStatus: ControlStatus | null;
}

export default function HomeControlStatus({ controlStatus }: HomeControlStatusProps) {
  const { theme } = useAppearance();

  if (!controlStatus || controlStatus.type === 'idle') {
    return null;
  }

  const getControlIcon = (type: string) => {
    switch (type) {
      case 'algae':
        return 'water';
      case 'ph':
        return 'flask';
      case 'ec':
        return 'leaf';
      case 'water_refill':
        return 'water-outline';
      default:
        return 'settings';
    }
  };

  const getControlColor = (type: string) => {
    switch (type) {
      case 'algae':
        return theme.error;
      case 'ph':
        return theme.warning;
      case 'ec':
        return theme.primary;
      case 'water_refill':
        return theme.info;
      default:
        return theme.textSecondary;
    }
  };

  const formatTime = (milliseconds: number) => {
    if (milliseconds === 0) return 'N/A';
    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const controlColor = getControlColor(controlStatus.type);
  const controlIcon = getControlIcon(controlStatus.type);
  const progress = Math.min(100, Math.max(0, controlStatus.progress));

  return (
    <View
      style={{
        backgroundColor: theme.background,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Ionicons name={controlIcon as any} size={24} color={controlColor} style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 2 }}>
            {controlStatus.type === 'water_refill' ? 'Water Refill' : controlStatus.type.toUpperCase()} Control Active
          </Text>
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
            {controlStatus.description}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={{ marginBottom: 8 }}>
        <View
          style={{
            height: 8,
            backgroundColor: theme.backgroundSecondary,
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: controlColor,
              borderRadius: 4,
            }}
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
            {progress}%
          </Text>
          {controlStatus.total > 0 && (
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>
              {formatTime(controlStatus.elapsed)} / {formatTime(controlStatus.total)}
            </Text>
          )}
          {controlStatus.total === 0 && controlStatus.elapsed > 0 && (
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>
              {formatTime(controlStatus.elapsed)} elapsed
            </Text>
          )}
        </View>
      </View>

      {/* State Info */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: theme.backgroundSecondary,
        }}
      >
        <Ionicons name="information-circle-outline" size={16} color={theme.textTertiary} style={{ marginRight: 6 }} />
        <Text style={{ fontSize: 11, color: theme.textTertiary, flex: 1 }}>
          State: {controlStatus.state.replace(/_/g, ' ')}
        </Text>
      </View>
    </View>
  );
}

