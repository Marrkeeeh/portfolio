import type { Supply, SupplyStatus } from "@/services/suppliesService";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

export interface SupplyCardProps {
  theme: any;
  colorScheme: string | null | undefined;
  supply: Supply;
}

const getColorsForSupply = (
  supply: Supply,
  colorScheme: string | null | undefined,
): { background: string; iconColor: string; icon: string } => {
  if (supply.type === "nutrient_a") {
    return {
      background: colorScheme === "dark" ? "#1a3a2a" : "#dcfce7",
      iconColor: colorScheme === "dark" ? "#4ade80" : "#16a34a",
      icon: "flask",
    };
  }
  if (supply.type === "nutrient_b") {
    return {
      background: colorScheme === "dark" ? "#1e293b" : "#dbeafe",
      iconColor: colorScheme === "dark" ? "#60a5fa" : "#2563eb",
      icon: "flask",
    };
  }
  if (supply.type === "ph_up") {
    return {
      background: colorScheme === "dark" ? "#3a2f1a" : "#fef3c7",
      iconColor: colorScheme === "dark" ? "#fbbf24" : "#d97706",
      icon: "arrow-up-circle",
    };
  }
  if (supply.type === "ph_down") {
    return {
      background: colorScheme === "dark" ? "#3a2a1a" : "#fed7aa",
      iconColor: colorScheme === "dark" ? "#fb923c" : "#ea580c",
      icon: "arrow-down-circle",
    };
  }
  if (supply.type === "hydrogen_peroxide") {
    return {
      background: colorScheme === "dark" ? "#2a1a3a" : "#e9d5ff",
      iconColor: colorScheme === "dark" ? "#a78bfa" : "#9333ea",
      icon: "water",
    };
  }
  // water_tank
  return {
    background: colorScheme === "dark" ? "#1a2a3a" : "#cffafe",
    iconColor: colorScheme === "dark" ? "#22d3ee" : "#0891b2",
    icon: "water",
  };
};

const getStatusLabel = (status: SupplyStatus): string => {
  switch (status) {
    case "in_stock":
      return "In Stock";
    case "need_refilled":
      return "Needs Refill";
    default:
      return status;
  }
};

export function SupplyCard({
  theme,
  colorScheme,
  supply,
}: SupplyCardProps) {
  const { background, iconColor, icon } = getColorsForSupply(supply, colorScheme);

  return (
    <View
      style={{
        width: "50%",
        padding: 6,
      }}
    >
      <View
        style={{
          backgroundColor: background,
          borderRadius: 12,
          padding: 16,
          height: 150,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 2,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: theme.text,
              marginBottom: 4,
            }}
          >
            {supply.display_name}
          </Text>
          <View style={{ flexDirection: "row", marginTop: 4 }}>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor:
                  supply.status === "in_stock" ? theme.success : theme.error,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: "#ffffff",
                }}
              >
                {getStatusLabel(supply.status)}
              </Text>
            </View>
          </View>
        </View>
        <Ionicons
          name={icon as any}
          size={48}
          color={iconColor}
          style={{ marginLeft: 8 }}
        />
      </View>
    </View>
  );
}
