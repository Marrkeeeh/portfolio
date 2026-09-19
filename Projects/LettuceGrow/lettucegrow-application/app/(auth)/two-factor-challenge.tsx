import { Button, KeyboardAwareScrollView, Logo, OtpInput, useDialog } from "@/components/ui";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useAuth } from "@/contexts/AuthContext";
import "@/global.css";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TwoFactorChallengeScreen() {
  const { theme, colorScheme } = useAppearance();
  const { user, isAuthenticated, verifyTwoFactor } = useAuth();
  const { showDialog, Dialog: DialogComponent } = useDialog();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // If for some reason we land here without being authenticated, go back to login
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/(auth)/login" as any);
    }
  }, [isAuthenticated]);

  const validateForm = () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Verification code is required");
      return false;
    }
    if (trimmed.length !== 6) {
      setError("Code must be 6 digits");
      return false;
    }
    setError(undefined);
    return true;
  };

  const handleVerify = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await verifyTwoFactor(code.trim());
      if (!result.success) {
        setError(result.error || "Invalid verification code");
        showDialog({
          title: "Two-factor verification failed",
          message: result.error || "Invalid verification code. Please try again.",
          icon: "alert-circle-outline",
          iconColor: "#ef4444",
        });
      } else {
        setError(undefined);
        showDialog({
          title: "Two-factor verified",
          message: result.message || "Your login has been verified.",
          icon: "checkmark-circle-outline",
          iconColor: "#059669",
        });
        // Small delay so the dialog can appear briefly before navigating
        setTimeout(() => {
          router.replace("/(app)/(drawer)/(tabs)" as any);
        }, 300);
      }
    } finally {
      setLoading(false);
    }
  };

  const gradientColors = colorScheme === "dark"
    ? ["#0a1f1a", "#0d2e24", "#064e3b", "#065f46"] as const
    : ["#10b981", "#059669", "#047857", "#065f46"] as const;

  return (
    <View className="flex-1" style={{ backgroundColor: colorScheme === "dark" ? "#0a1f1a" : "#10b981" }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colorScheme === "dark" ? "#0a1f1a" : "#059669"}
      />
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="flex-1"
        style={{ flex: 1 }}
      >
        <DialogComponent />
        <SafeAreaView className="flex-1" edges={["top"]}>
          <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <View className="flex-1 justify-center px-6 py-12">
              {/* Header */}
              <View className="items-center mb-10">
                <Logo size="medium" className="mb-5" />
                <Text className="text-[26px] font-extrabold text-white mb-2 tracking-wide text-center">
                  Two-Factor Authentication
                </Text>
                <Text className="text-sm text-white/90 text-center font-normal">
                  Enter the 6-digit code from your authenticator app{user?.username ? ` for @${user.username}` : ""}.
                </Text>
              </View>

              {/* Card */}
              <View
                className="rounded-3xl p-7 shadow-2xl border"
                style={{
                  backgroundColor: theme.background,
                  borderColor: theme.borderLight,
                }}
              >
                <OtpInput
                  label="Authentication Code"
                  value={code}
                  onChange={(text: string) => {
                    setCode(text);
                    setError(undefined);
                  }}
                  error={error}
                />

                <Button
                  title="Verify"
                  onPress={handleVerify}
                  loading={loading}
                  icon="shield-checkmark-outline"
                  fullWidth
                  variant="primary"
                  size="large"
                  containerStyle={{ marginTop: 24 }}
                />

                <Button
                  title="Back to Login"
                  onPress={() => router.replace("/(auth)/login" as any)}
                  variant="ghost"
                  size="medium"
                  fullWidth
                  containerStyle={{ marginTop: 12 }}
                />
              </View>
            </View>
          </KeyboardAwareScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
