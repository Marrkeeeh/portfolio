import { useAppearance } from "@/contexts/AppearanceContext";
import React, { useRef } from "react";
import { NativeSyntheticEvent, StyleSheet, Text, TextInput, TextInputKeyPressEventData, TextInputProps, View } from "react-native";

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  containerStyle?: object;
  inputProps?: TextInputProps;
}

export default function OtpInput({
  length = 6,
  value,
  onChange,
  label,
  error,
  containerStyle,
  inputProps,
}: OtpInputProps) {
  const { theme } = useAppearance();
  const inputsRef = useRef<(TextInput | null)[]>([]);

  const digits = Array.from({ length }).map((_, index) => value[index] || "");

  const handleChange = (index: number, text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");

    const chars = value.split("");

    if (cleaned.length === 0) {
      chars[index] = "";
      const next = chars.join("").slice(0, length);
      onChange(next);
      return;
    }

    // Use the last entered digit
    chars[index] = cleaned[cleaned.length - 1];
    let next = chars.join("");
    if (next.length > length) {
      next = next.slice(0, length);
    }
    onChange(next);

    if (index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      )}
      <View style={styles.inputsRow}>
        {digits.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              inputsRef.current[index] = ref;
            }}
            style={[
              styles.input,
              {
                borderColor: error ? theme.error : theme.border,
                backgroundColor: theme.background,
                color: theme.text,
              },
            ]}
            value={digit}
            onChangeText={(text) => handleChange(index, text)}
            keyboardType="number-pad"
            maxLength={1}
            textAlign="center"
            onKeyPress={(e) => handleKeyPress(index, e)}
            {...inputProps}
          />
        ))}
      </View>
      {error && <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  inputsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  input: {
    width: 42,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 18,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
