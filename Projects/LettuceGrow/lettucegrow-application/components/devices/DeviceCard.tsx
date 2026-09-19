import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import type { DeviceListItem } from "./types";

type DeviceCardProps = {
  device: DeviceListItem;
  theme: any;
  colorScheme: string | null | undefined;
  onShowDetails: (device: DeviceListItem) => void;
  onEdit: (device: DeviceListItem) => void;
  onRemove: (device: DeviceListItem) => void;
  onShare?: (device: DeviceListItem) => void;
};

const getStatusColor = (theme: any, status: string) => {
  return status === "connected" ? theme.success : theme.error;
};

const getStatusIcon = (status: string) => {
  return status === "connected" ? "checkmark-circle" : "close-circle";
};

export function DeviceCard({
  device,
  theme,
  colorScheme,
  onShowDetails,
  onEdit,
  onRemove,
  onShare,
}: DeviceCardProps) {
  const statusColor = getStatusColor(theme, device.status);
  const statusIcon = getStatusIcon(device.status);
  const isOwner = device.is_owner !== false; // Default to true if not set

  return (
    <View
      style={{
        backgroundColor: theme.background,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: theme.borderLight,
      }}
    >
      {/* Header Section */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 16 }}>
        {/* Device Icon */}
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            backgroundColor: colorScheme === "dark" ? "#1e293b" : "#e0e7ff",
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
          }}
        >
          <Ionicons name="hardware-chip-outline" size={28} color={theme.info} />
        </View>

        {/* Device Info */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: theme.text,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {device.name}
            </Text>
            {device.is_shared && (
              <View
                style={{
                  marginLeft: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  backgroundColor: colorScheme === "dark" ? "rgba(147,51,234,0.25)" : "rgba(147,51,234,0.15)",
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: "#a855f7",
                    letterSpacing: 0.5,
                  }}
                >
                  SHARED
                </Text>
              </View>
            )}
          </View>
          
          <Text
            style={{
              fontSize: 13,
              color: theme.textSecondary,
              marginBottom: 4,
            }}
          >
            {device.type}
          </Text>
          
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
            <Ionicons name="code-outline" size={12} color={theme.textTertiary} />
            <Text
              style={{
                fontSize: 12,
                color: theme.textTertiary,
                marginLeft: 4,
              }}
            >
              {device.deviceId}
            </Text>
            {device.location && (
              <>
                <Text style={{ color: theme.textTertiary, marginHorizontal: 6 }}>•</Text>
                <Ionicons name="location-outline" size={12} color={theme.textTertiary} />
                <Text
                  style={{
                    fontSize: 12,
                    color: theme.textTertiary,
                    marginLeft: 4,
                  }}
                >
                  {device.location}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Status Section */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 12,
          paddingHorizontal: 12,
          backgroundColor: colorScheme === "dark" ? "rgba(30,41,59,0.5)" : "rgba(241,245,249,0.5)",
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Ionicons
            name={statusIcon as any}
            size={20}
            color={statusColor}
            style={{ marginRight: 8 }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: statusColor,
                textTransform: "capitalize",
                marginBottom: 2,
              }}
            >
              {device.status}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: theme.textTertiary,
              }}
            >
              Last seen: {device.lastSeen}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <TouchableOpacity
          onPress={() => onShowDetails(device)}
          style={{
            flex: 1,
            minWidth: "30%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 10,
            backgroundColor:
              colorScheme === "dark" ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.1)",
            borderWidth: 1,
            borderColor: colorScheme === "dark" ? "rgba(59,130,246,0.3)" : "rgba(59,130,246,0.2)",
          }}
        >
          <Ionicons name="information-circle-outline" size={16} color={theme.info} style={{ marginRight: 6 }} />
          <Text
            style={{
              fontSize: 13,
              color: theme.info,
              fontWeight: "600",
            }}
          >
            Details
          </Text>
        </TouchableOpacity>

        {isOwner && (
          <>
            <TouchableOpacity
              onPress={() => onEdit(device)}
              style={{
                flex: 1,
                minWidth: "30%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor:
                  colorScheme === "dark" ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.1)",
                borderWidth: 1,
                borderColor: colorScheme === "dark" ? "rgba(34,197,94,0.3)" : "rgba(34,197,94,0.2)",
              }}
            >
              <Ionicons name="create-outline" size={16} color={theme.primary} style={{ marginRight: 6 }} />
              <Text
                style={{
                  fontSize: 13,
                  color: theme.primary,
                  fontWeight: "600",
                }}
              >
                Edit
              </Text>
            </TouchableOpacity>

            {onShare && (
              <TouchableOpacity
                onPress={() => onShare(device)}
                style={{
                  flex: 1,
                  minWidth: "30%",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor:
                    colorScheme === "dark" ? "rgba(147,51,234,0.2)" : "rgba(147,51,234,0.1)",
                  borderWidth: 1,
                  borderColor: colorScheme === "dark" ? "rgba(147,51,234,0.3)" : "rgba(147,51,234,0.2)",
                }}
              >
                <Ionicons name="share-social-outline" size={16} color="#a855f7" style={{ marginRight: 6 }} />
                <Text
                  style={{
                    fontSize: 13,
                    color: "#a855f7",
                    fontWeight: "600",
                  }}
                >
                  Share
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => onRemove(device)}
              style={{
                flex: 1,
                minWidth: "30%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor:
                  colorScheme === "dark" ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.1)",
                borderWidth: 1,
                borderColor: colorScheme === "dark" ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.2)",
              }}
            >
              <Ionicons name="trash-outline" size={16} color={theme.error} style={{ marginRight: 6 }} />
              <Text
                style={{
                  fontSize: 13,
                  color: theme.error,
                  fontWeight: "600",
                }}
              >
                Remove
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
