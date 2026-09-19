import "@/global.css";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableOpacityProps,
    View,
} from "react-native";

export interface ButtonProps extends Omit<TouchableOpacityProps, "style"> {
  title: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "small" | "medium" | "large";
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  containerStyle?: object;
  textStyle?: object;
}

export default function Button({
  title,
  variant = "primary",
  size = "medium",
  loading = false,
  icon,
  iconPosition = "left",
  fullWidth = false,
  disabled,
  containerStyle,
  textStyle,
  ...touchableProps
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          container: styles.primaryContainer,
          text: styles.primaryText,
          disabled: styles.primaryDisabled,
        };
      case "secondary":
        return {
          container: styles.secondaryContainer,
          text: styles.secondaryText,
          disabled: styles.secondaryDisabled,
        };
      case "outline":
        return {
          container: styles.outlineContainer,
          text: styles.outlineText,
          disabled: styles.outlineDisabled,
        };
      case "ghost":
        return {
          container: styles.ghostContainer,
          text: styles.ghostText,
          disabled: styles.ghostDisabled,
        };
      case "danger":
        return {
          container: styles.dangerContainer,
          text: styles.dangerText,
          disabled: styles.dangerDisabled,
        };
      default:
        return {
          container: styles.primaryContainer,
          text: styles.primaryText,
          disabled: styles.primaryDisabled,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return { container: styles.smallContainer, text: styles.smallText };
      case "large":
        return { container: styles.largeContainer, text: styles.largeText };
      default:
        return { container: styles.mediumContainer, text: styles.mediumText };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      style={[
        styles.baseContainer,
        variantStyles.container,
        sizeStyles.container,
        isDisabled && variantStyles.disabled,
        fullWidth && styles.fullWidth,
        containerStyle,
      ]}
      disabled={isDisabled}
      activeOpacity={0.7}
      {...touchableProps}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" || variant === "danger" ? "#ffffff" : "#059669"}
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === "left" && (
            <Ionicons
              name={icon}
              size={size === "small" ? 16 : size === "large" ? 24 : 20}
              color={
                variant === "primary" || variant === "danger"
                  ? "#ffffff"
                  : variant === "outline" || variant === "ghost"
                    ? "#059669"
                    : "#ffffff"
              }
              style={styles.leftIcon}
            />
          )}
          <Text
            style={[
              styles.baseText,
              variantStyles.text,
              sizeStyles.text,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === "right" && (
            <Ionicons
              name={icon}
              size={size === "small" ? 16 : size === "large" ? 24 : 20}
              color={
                variant === "primary" || variant === "danger"
                  ? "#ffffff"
                  : variant === "outline" || variant === "ghost"
                    ? "#059669"
                    : "#ffffff"
              }
              style={styles.rightIcon}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseContainer: {
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidth: {
    width: "100%",
  },
  // Variants - Primary
  primaryContainer: {
    backgroundColor: "#059669",
  },
  primaryText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  primaryDisabled: {
    backgroundColor: "#9ca3af",
    opacity: 0.6,
  },
  // Variants - Secondary
  secondaryContainer: {
    backgroundColor: "#10b981",
  },
  secondaryText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  secondaryDisabled: {
    backgroundColor: "#9ca3af",
    opacity: 0.6,
  },
  // Variants - Outline
  outlineContainer: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#059669",
  },
  outlineText: {
    color: "#059669",
    fontWeight: "600",
  },
  outlineDisabled: {
    borderColor: "#9ca3af",
    opacity: 0.6,
  },
  // Variants - Ghost
  ghostContainer: {
    backgroundColor: "transparent",
  },
  ghostText: {
    color: "#059669",
    fontWeight: "600",
  },
  ghostDisabled: {
    opacity: 0.5,
  },
  // Variants - Danger
  dangerContainer: {
    backgroundColor: "#ef4444",
  },
  dangerText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  dangerDisabled: {
    backgroundColor: "#9ca3af",
    opacity: 0.6,
  },
  // Sizes
  smallContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallText: {
    fontSize: 14,
  },
  mediumContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mediumText: {
    fontSize: 16,
  },
  largeContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  largeText: {
    fontSize: 18,
  },
  // Base text
  baseText: {
    textAlign: "center",
  },
  // Icons
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
});

