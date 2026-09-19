import { Button, Input, KeyboardAwareScrollView, Logo } from "@/components/ui";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

type DevicesAddFormProps = {
  theme: any;
  colorScheme: string | null | undefined;
  deviceNameInput: string;
  deviceCodeInput: string;
  devicePinInput: string;
  isConnecting: boolean;
  onChangeDeviceName: (value: string) => void;
  onChangeDeviceCode: (value: string) => void;
  onChangeDevicePin: (value: string) => void;
  onConnect: () => void;
  onCancel: () => void;
};

const getConnectionStatusStyles = (
  theme: any,
  colorScheme: string | null | undefined,
  isConnecting: boolean,
  deviceCodeInput: string,
) => {
  if (isConnecting) {
    return {
      dotColor: theme.info,
      borderColor: "#38bdf8",
      backgroundColor: colorScheme === "dark" ? "#0f172a" : "#e0f2fe",
      text: "Connecting to device...",
      helper: "Verifying your device ID and claiming it to your account",
    };
  }

  if (deviceCodeInput.trim().length > 0) {
    return {
      dotColor: theme.success,
      borderColor: "#6ee7b7",
      backgroundColor: colorScheme === "dark" ? "#022c22" : "#ecfdf5",
      text: "Device ready to connect",
      helper: "Review the details below, then tap Connect Device",
    };
  }

  return {
    dotColor: "#9ca3af",
    borderColor: theme.border,
    backgroundColor: colorScheme === "dark" ? "#020617" : "#f9fafb",
    text: "Waiting for device ID",
    helper: "Enter the device ID printed on your device label to get started",
  };
};

export function DevicesAddForm({
  theme,
  colorScheme,
  deviceNameInput,
  deviceCodeInput,
  devicePinInput,
  isConnecting,
  onChangeDeviceName,
  onChangeDeviceCode,
  onChangeDevicePin,
  onConnect,
  onCancel,
}: DevicesAddFormProps) {
  const statusStyles = getConnectionStatusStyles(
    theme,
    colorScheme,
    isConnecting,
    deviceCodeInput,
  );

  return (
    <KeyboardAwareScrollView>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, flex: 1 }}>
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <Logo size="large" />
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: theme.text,
              marginTop: 12,
              marginBottom: 4,
              textAlign: "center",
            }}
          >
            Connect Your Device
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.textSecondary,
              textAlign: "center",
            }}
          >
            Let&apos;s get your hydroponics system online
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ alignItems: "center", marginRight: 16 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: theme.primary,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#ffffff",
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  1
                </Text>
              </View>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  fontWeight: "600",
                  color: theme.primary,
                }}
              >
                Device
              </Text>
            </View>
            <View
              style={{
                height: 2,
                width: 40,
                backgroundColor: theme.border,
              }}
            />
            <View style={{ alignItems: "center", marginLeft: 16 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: theme.backgroundTertiary,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  2
                </Text>
              </View>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  fontWeight: "600",
                  color: theme.textTertiary,
                }}
              >
                Complete
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            backgroundColor: theme.background,
            borderRadius: 20,
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 4,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: theme.borderLight,
          }}
        >
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "600",
                color: theme.text,
                marginBottom: 4,
                textAlign: "center",
              }}
            >
              Device Connection
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: theme.textSecondary,
                textAlign: "center",
              }}
            >
              Connect your LettuceGrow monitoring device
            </Text>
          </View>

          <View
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 12,
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: statusStyles.borderColor,
              backgroundColor: statusStyles.backgroundColor,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
              }}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: statusStyles.dotColor,
                  marginRight: 8,
                }}
              />
              <Text
                style={{
                  fontSize: 14,
                  color: theme.textSecondary,
                  fontWeight: "500",
                }}
              >
                {statusStyles.text}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: theme.textTertiary,
                textAlign: "center",
              }}
            >
              {statusStyles.helper}
            </Text>
          </View>

          <View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.text,
                marginBottom: 8,
              }}
            >
              Device Connection
            </Text>
            <Input
              label="Device Name"
              value={deviceNameInput}
              onChangeText={onChangeDeviceName}
              placeholder="e.g., LettuceGrow-Sensor-001"
              leftIcon="hardware-chip-outline"
            />

            <Input
              label="Device ID"
              value={deviceCodeInput}
              onChangeText={onChangeDeviceCode}
              placeholder="Enter the ID printed on your device"
              leftIcon="finger-print-outline"
            />
            <Text
              style={{
                fontSize: 12,
                color: theme.textTertiary,
                marginBottom: 4,
              }}
            >
              The device ID is printed on your device label.
            </Text>
            <Input
              label="Device PIN"
              value={devicePinInput}
              onChangeText={onChangeDevicePin}
              placeholder="Enter the 6-digit PIN"
              leftIcon="lock-closed-outline"
              keyboardType="numeric"
              maxLength={6}
            />
          </View>

          <Button
            title="Connect Device"
            variant="primary"
            size="medium"
            icon="link-outline"
            fullWidth
            loading={isConnecting}
            onPress={onConnect}
            containerStyle={{ marginTop: 16 }}
          />

          <Button
            title="Skip for now"
            variant="ghost"
            size="medium"
            icon="arrow-back-outline"
            fullWidth
            onPress={onCancel}
            containerStyle={{ marginTop: 8 }}
          />
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}
