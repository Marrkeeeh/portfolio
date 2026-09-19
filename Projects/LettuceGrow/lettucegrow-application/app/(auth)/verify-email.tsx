import { Button, Input, KeyboardAwareScrollView, Logo, useDialog } from "@/components/ui";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useAuth } from "@/contexts/AuthContext";
import "@/global.css";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function VerifyEmailScreen() {
  const { verifyEmailOtp, resendEmailOtp, user } = useAuth();
  const { theme, colorScheme } = useAppearance();
  const insets = useSafeAreaInsets();
  const { showDialog, Dialog: DialogComponent } = useDialog();
  
  // Theme-aware gradient colors - much darker for dark mode
  const gradientColors = colorScheme === 'dark' 
    ? ["#064e3b", "#065f46", "#047857", "#059669"] as const // Very dark green gradient for dark mode
    : ["#059669", "#10b981", "#34d399"] as const; // Original bright gradient for light mode

  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  // Check if user has email, if not redirect back
  React.useEffect(() => {
    if (user && !user.email) {
      showDialog({
        title: "No Email Address",
        message: "Your account doesn't have an email address. Email verification is not required.",
        icon: "mail-outline",
        iconColor: "#f59e0b",
        buttons: [
          {
            text: "OK",
            onPress: () => {
              // Navigate directly to the app dashboard
              router.replace("/(app)/(drawer)/(tabs)" as any);
            },
          },
        ],
      });
    }
  }, [user, showDialog]);

  const handleVerify = async () => {
    if (!otpCode.trim()) {
      setError("OTP code is required");
      return;
    }

    if (otpCode.length !== 6) {
      setError("OTP code must be 6 digits");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await verifyEmailOtp(otpCode);

      if (result.success) {
        // Wait a bit for auth state to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        showDialog({
          title: "Email Verified",
          message: "Your email has been successfully verified!",
          icon: "checkmark-circle",
          iconColor: "#059669",
          buttons: [
            {
              text: "OK",
              onPress: () => {
                // Navigate directly to the app dashboard
                router.replace("/(app)/(drawer)/(tabs)" as any);
              },
            },
          ],
        });
      } else {
        // Show more specific error messages
        const errorMessage = result.error || result.message || "Invalid OTP code";
        setError(errorMessage);
      }
    } catch (err: any) {
      setError(err.message || "Failed to verify email");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");

    try {
      const result = await resendEmailOtp();

      if (result.success) {
        showDialog({
          title: "OTP Resent",
          message: "A new verification code has been sent to your email.",
          icon: "mail-outline",
          iconColor: "#059669",
        });
        setOtpCode("");
      } else {
        setError(result.error || "Failed to resend OTP");
      }
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <DialogComponent />
      <View className="flex-1" style={{ backgroundColor: colorScheme === 'dark' ? "#0a1f1a" : "#059669" }}>
        <StatusBar 
          barStyle="light-content" 
          backgroundColor={colorScheme === 'dark' ? "#0a1f1a" : "#059669"} 
        />
        <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        <LinearGradient
          colors={gradientColors}
          className="flex-1"
          style={{ flex: 1 }}
        >
          <KeyboardAwareScrollView
            contentContainerStyle={{ 
              flexGrow: 1,
            }}
          >
            <View className="flex-1 justify-center px-6 py-8" style={{ paddingTop: insets.top }}>
                <View className="items-center mb-8">
                <Logo size="large" />
                <Text className="text-white text-3xl font-bold mt-6 mb-2">
                  Verify Your Email
                </Text>
                <Text className="text-white/80 text-center text-base px-4">
                  We&apos;ve sent a 6-digit verification code to{"\n"}
                  <Text className="font-semibold">
                    {user?.email || "your email"}
                  </Text>
                </Text>
                </View>

                <View 
                  className="rounded-3xl p-6 shadow-2xl"
                  style={{ backgroundColor: theme.background }}
                >
                <View className="mb-6">
                  <Text style={{ fontSize: 16, color: theme.text, marginBottom: 8, fontWeight: '500' }}>
                    Enter Verification Code
                  </Text>
                  <Input
                    placeholder="000000"
                    value={otpCode}
                    onChangeText={(text) => {
                      setOtpCode(text.replace(/[^0-9]/g, "").slice(0, 6));
                      setError("");
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    className="text-center text-2xl font-bold tracking-widest"
                  />
                  {error ? (
                    <Text style={{ fontSize: 14, color: theme.error, marginTop: 8 }}>
                      {error}
                    </Text>
                  ) : null}
                </View>

                <Button
                  title="Verify Email"
                  onPress={handleVerify}
                  loading={loading}
                  className="mb-4"
                />

                <View className="items-center mt-4">
                  <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 8 }}>
                    Didn&apos;t receive the code?
                  </Text>
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={resending}
                    className="opacity-80"
                  >
                    <Text style={{ fontSize: 14, color: theme.primary, fontWeight: '600' }}>
                      {resending ? "Resending..." : "Resend Code"}
                    </Text>
                  </TouchableOpacity>
                </View>
                </View>

                <TouchableOpacity
                  onPress={() => router.back()}
                  className="mt-6 items-center"
                >
                  <Text className="text-white/80 text-base">
                    Back to Login
                  </Text>
                </TouchableOpacity>
              </View>
          </KeyboardAwareScrollView>
        </LinearGradient>
      </SafeAreaView>
    </View>
    </>
  );
}

