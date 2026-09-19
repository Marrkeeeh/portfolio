import { Button, Input, KeyboardAwareScrollView, Logo, useDialog } from "@/components/ui";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useAuth } from "@/contexts/AuthContext";
import "@/global.css";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const { theme, colorScheme } = useAppearance();
  const { showDialog, Dialog: DialogComponent } = useDialog();
  
  // Theme-aware gradient colors - much darker for dark mode
  const gradientColors = colorScheme === 'dark' 
    ? ["#0a1f1a", "#0d2e24", "#064e3b", "#065f46"] as const // Very dark green gradient for dark mode
    : ["#10b981", "#059669", "#047857", "#065f46"] as const; // Original bright gradient for light mode

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string }>({});

  const validateForm = () => {
    const newErrors: { email?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendReset = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await requestPasswordReset(email);

      if (result.success) {
        showDialog({
          title: "OTP Sent",
          message: result.message || "Password reset OTP has been sent to your email. Please check your inbox.",
          icon: "mail-outline",
          iconColor: "#059669",
          buttons: [
            {
              text: "OK",
              onPress: () => router.push({
                pathname: "/(auth)/reset-password",
                params: { email: email.trim() },
              } as any),
            },
          ],
        });
      } else {
        const errorMessage = result.error || result.message || "Failed to send reset OTP. Please try again.";
        showDialog({
          title: "Error",
          message: errorMessage,
          icon: "alert-circle",
          iconColor: "#ef4444",
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || "An unexpected error occurred";
      showDialog({
        title: "Error",
        message: errorMessage,
        icon: "alert-circle",
        iconColor: "#ef4444",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DialogComponent />
      <View className="flex-1" style={{ backgroundColor: colorScheme === 'dark' ? "#0a1f1a" : "#10b981" }}>
        <StatusBar 
          barStyle="light-content" 
          backgroundColor={colorScheme === 'dark' ? "#0a1f1a" : "#059669"} 
        />
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="flex-1"
        style={{ flex: 1 }}
      >
        {/* Decorative Background Elements */}
        <View className="absolute w-[300px] h-[300px] rounded-full bg-white/8 -top-[100px] -right-[100px]" />
        <View className="absolute w-[200px] h-[200px] rounded-full bg-white/6 bottom-[100px] -left-[50px]" />
        <View className="absolute w-[150px] h-[150px] rounded-full bg-white/5 top-[40%] -right-[30px]" />

        <SafeAreaView className="flex-1" edges={["top"]}>
          <KeyboardAwareScrollView
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View className="flex-1 justify-center px-6 py-12">
                {/* Logo and Header */}
                <View className="items-center mb-12">
                  <Logo size="medium" className="mb-5" />
                  <Text className="text-[36px] font-extrabold text-white mb-2 tracking-wide">
                    LettuceGrow
                  </Text>
                  <Text className="text-base text-white/90 text-center font-normal">
                    Smart Hydroponics Monitoring System
                  </Text>
                </View>

                {/* Reset Password Form Card */}
                <View 
                  className="rounded-3xl p-7 shadow-2xl border"
                  style={{
                    backgroundColor: theme.background,
                    borderColor: theme.borderLight,
                  }}
                >
                  <View className="mb-8">
                    <View 
                      className="w-16 h-16 rounded-full justify-center items-center self-center mb-4"
                      style={{ backgroundColor: theme.backgroundTertiary }}
                    >
                      <Ionicons name="key-outline" size={32} color={theme.primary} />
                    </View>
                    <Text 
                      style={{ 
                        fontSize: 28, 
                        fontWeight: 'bold', 
                        color: theme.text, 
                        marginBottom: 8, 
                        textAlign: 'center',
                        letterSpacing: 0.5,
                      }}
                    >
                      Reset Password
                    </Text>
                    <Text 
                      style={{ 
                        fontSize: 15, 
                        color: theme.textSecondary, 
                        textAlign: 'center',
                        lineHeight: 22,
                      }}
                    >
                      Enter your email address and we&apos;ll send you an OTP code to reset your
                      password.
                    </Text>
                  </View>

                  {/* Email Input */}
                  <Input
                    label="Email Address"
                    icon="mail-outline"
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={(text: string) => {
                      setEmail(text);
                      setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    error={errors.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    containerStyle={{ marginBottom: 24 }}
                  />

                  {/* Send OTP Button */}
                  <Button
                    title="Send OTP Code"
                    onPress={handleSendReset}
                    loading={loading}
                    icon="mail-outline"
                    fullWidth
                    variant="primary"
                    size="large"
                  />
                </View>

                {/* Back to Login */}
                <View className="items-center mt-8">
                  <TouchableOpacity
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                    className="flex-row items-center"
                  >
                    <Ionicons name="arrow-back-outline" size={18} color="rgba(255, 255, 255, 0.9)" />
                    <Text className="text-[15px] text-white/90 font-medium ml-1.5">
                      Back to Login
                    </Text>
                  </TouchableOpacity>
                </View>
            </View>
          </KeyboardAwareScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
    </>
  );
}
