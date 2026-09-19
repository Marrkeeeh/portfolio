import "@/global.css";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

export interface TextareaProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  error?: string;
  containerStyle?: object;
  inputStyle?: object;
  rows?: number;
}

export default function Textarea({
  label,
  icon,
  iconColor = "#059669",
  error,
  containerStyle,
  inputStyle,
  rows = 4,
  ...textInputProps
}: TextareaProps) {
  const minHeight = rows * 20 + 24; // Approximate height based on rows

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelContainer}>
          {icon && (
            <Ionicons name={icon} size={16} color={iconColor} style={styles.labelIcon} />
          )}
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
      <TextInput
        style={[
          styles.textarea,
          { minHeight },
          error && styles.textareaError,
          textInputProps.editable === false && styles.textareaDisabled,
          inputStyle,
        ]}
        placeholderTextColor="#9ca3af"
        multiline
        textAlignVertical="top"
        {...textInputProps}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
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
    color: "#374151",
  },
  textarea: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  textareaError: {
    borderColor: "#ef4444",
  },
  textareaDisabled: {
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});

