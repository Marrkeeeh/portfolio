import { Button, Input, KeyboardAwareScrollView, Logo, useDialog } from "@/components/ui";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useAuth } from "@/contexts/AuthContext";
import "@/global.css";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ResetPasswordScreen() {
  const { resetPassword } = useAuth();
  const { theme, colorScheme } = useAppearance();
  const { showDialog, Dialog: DialogComponent } = useDialog();
  const params = useLocalSearchParams<{ email?: string }>();
  
  // Theme-aware gradient colors - much darker for dark mode
  const gradientColors = colorScheme === 'dark' 
    ? ["#0a1f1a", "#0d2e24", "#064e3b", "#065f46"] as const // Very dark green gradient for dark mode
    : ["#10b981", "#059669", "#047857", "#065f46"] as const; // Original bright gradient for light mode

  const [email, setEmail] = useState(params.email || "");
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    otpCode?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const checkPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return strength;
  };

  const getPasswordStrengthColor = (strength: number) => {
    if (strength < 2) return "#ef4444";
    if (strength < 4) return "#f59e0b";
    return "#10b981";
  };

  const getPasswordStrengthText = (strength: number) => {
    if (strength < 2) return "Weak";
    if (strength < 4) return "Medium";
    return "Strong";
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!otpCode.trim()) {
      newErrors.otpCode = "OTP code is required";
    } else if (otpCode.length !== 6) {
      newErrors.otpCode = "OTP code must be 6 digits";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (checkPasswordStrength(password) < 2) {
      newErrors.password = "Password is too weak";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await resetPassword(
        email.trim(),
        otpCode.trim(),
        password,
        confirmPassword
      );

      if (result.success) {
        showDialog({
          title: "Password Reset Successful",
          message: result.message || "Your password has been reset successfully. You can now login with your new password.",
          icon: "checkmark-circle",
          iconColor: "#059669",
          buttons: [
            {
              text: "OK",
              onPress: () => router.replace("/(auth)/login"),
            },
          ],
        });
      } else {
        setErrors({
          otpCode: result.error || "Failed to reset password. The OTP may have expired.",
        });
      }
    } catch (error: any) {
      setErrors({ otpCode: error.message || "An unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = password ? checkPasswordStrength(password) : 0;


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
                      <Ionicons name="lock-closed-outline" size={32} color={theme.primary} />
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
                      Reset Your Password
                    </Text>
                    <Text 
                      style={{ 
                        fontSize: 15, 
                        color: theme.textSecondary, 
                        textAlign: 'center',
                        lineHeight: 22,
                      }}
                    >
                      Enter the OTP code sent to your email and your new password
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
                    containerStyle={{ marginBottom: 16 }}
                    editable={!params.email}
                  />

                  {/* OTP Code Input */}
                  <Input
                    label="OTP Code"
                    icon="key-outline"
                    placeholder="000000"
                    value={otpCode}
                    onChangeText={(text: string) => {
                      setOtpCode(text.replace(/[^0-9]/g, "").slice(0, 6));
                      setErrors((prev) => ({ ...prev, otpCode: undefined }));
                    }}
                    error={errors.otpCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    containerStyle={{ marginBottom: 16 }}
                    className="text-center text-xl font-bold tracking-widest"
                  />

                  {/* Password Input */}
                  <View>
                    <Input
                      label="New Password"
                      icon="lock-closed-outline"
                      placeholder="Enter new password"
                      value={password}
                      onChangeText={(text: string) => {
                        setPassword(text);
                        setErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                      error={errors.password}
                      secureTextEntry
                      autoComplete="password-new"
                      showPasswordToggle
                      passwordVisible={showPassword}
                      onTogglePassword={() => setShowPassword(!showPassword)}
                      containerStyle={{ marginBottom: password ? 8 : 16 }}
                    />
                    {password && (
                      <View className="mt-2 mb-2">
                        <View 
                          className="h-1 rounded-full w-full overflow-hidden"
                          style={{ backgroundColor: theme.border }}
                        >
                          <View
                            className="h-full rounded-full"
                            style={{
                              width: `${(passwordStrength / 5) * 100}%`,
                              backgroundColor: getPasswordStrengthColor(passwordStrength),
                            }}
                          />
                        </View>
                        <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 4, fontWeight: '500' }}>
                          Password strength: {getPasswordStrengthText(passwordStrength)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Confirm Password Input */}
                  <Input
                    label="Confirm Password"
                    icon="lock-closed-outline"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChangeText={(text: string) => {
                      setConfirmPassword(text);
                      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }}
                    error={errors.confirmPassword}
                    secureTextEntry
                    autoComplete="password-new"
                    showPasswordToggle
                    passwordVisible={showConfirmPassword}
                    onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                    containerStyle={{ marginBottom: 24 }}
                  />

                  {/* Reset Button */}
                  <Button
                    title="Reset Password"
                    onPress={handleResetPassword}
                    loading={loading}
                    icon="key-outline"
                    fullWidth
                    variant="primary"
                    size="large"
                  />
                </View>

                {/* Back to Login */}
                <View className="items-center mt-8">
                  <TouchableOpacity
                    onPress={() => router.replace("/(auth)/login")}
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
