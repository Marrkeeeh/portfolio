import { useAppearance } from "@/contexts/AppearanceContext";
import "@/global.css";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

export interface InputProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  error?: string;
  containerStyle?: object;
  inputStyle?: object;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  showPasswordToggle?: boolean;
  passwordVisible?: boolean;
  onTogglePassword?: () => void;
}

export default function Input({
  label,
  icon,
  iconColor,
  error,
  containerStyle,
  inputStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
  showPasswordToggle = false,
  passwordVisible = false,
  onTogglePassword,
  secureTextEntry,
  ...textInputProps
}: InputProps) {
  const { theme } = useAppearance();
  const displayIcon = leftIcon || icon;
  const displayRightIcon = showPasswordToggle
    ? (passwordVisible ? "eye-off-outline" : "eye-outline")
    : rightIcon;
  
  const finalIconColor = iconColor || theme.primary;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelContainer}>
          {displayIcon && (
            <Ionicons name={displayIcon} size={16} color={finalIconColor} style={styles.labelIcon} />
          )}
          <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
        </View>
      )}
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.background,
              borderColor: error ? theme.error : theme.border,
              color: theme.text,
            },
            error && { borderColor: theme.error },
            textInputProps.editable === false && {
              backgroundColor: theme.backgroundSecondary,
              color: theme.textTertiary,
            },
            inputStyle,
          ]}
          placeholderTextColor={theme.textTertiary}
          secureTextEntry={secureTextEntry && !passwordVisible}
          {...textInputProps}
        />
        {displayRightIcon && (
          <View style={styles.rightIconContainer}>
            <Ionicons
              name={displayRightIcon}
              size={20}
              color={theme.textSecondary}
              onPress={showPasswordToggle ? onTogglePassword : onRightIconPress}
              style={styles.rightIcon}
            />
          </View>
        )}
      </View>
      {error && <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  labelIcon: {
    marginRight: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
  },
  rightIconContainer: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  rightIcon: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});

