import { Button, Input, KeyboardAwareScrollView, Logo } from "@/components/ui";
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
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  console.log("🔐 LoginScreen rendering...");
  
  const { login } = useAuth();
  const { theme, colorScheme } = useAppearance();
  
  console.log("🔐 LoginScreen - theme loaded:", !!theme, "colorScheme:", colorScheme);
  
  // Theme-aware gradient colors - much darker for dark mode
  const gradientColors = colorScheme === 'dark' 
    ? ["#0a1f1a", "#0d2e24", "#064e3b", "#065f46"] as const // Very dark green gradient for dark mode
    : ["#10b981", "#059669", "#047857", "#065f46"] as const; // Original bright gradient for light mode

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  const validateForm = () => {
    const newErrors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      newErrors.username = "Username or email is required";
    }

    if (!password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await login(username.trim(), password);

      if (result.success) {
        // If 2FA is required, go to two-factor challenge screen
        if (result.requires2FA) {
          router.replace("/(auth)/two-factor-challenge" as any);
        } else {
          // Wait a bit for auth state to update
          await new Promise(resolve => setTimeout(resolve, 500));
          // Navigate directly to the app dashboard
          router.replace("/(app)/(drawer)/(tabs)" as any);
        }
      } else {
        setErrors({ password: result.error || "Invalid credentials. Please try again." });
      }
    } catch (error: any) {
      setErrors({ password: error.message || "An unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  };

  return (
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

                {/* Login Form Card */}
                <View 
                  className="rounded-3xl p-7 shadow-2xl border"
                  style={{
                    backgroundColor: theme.background,
                    borderColor: theme.borderLight,
                  }}
                >
                  <View className="mb-8">
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
                      Welcome Back
                    </Text>
                    <Text 
                      style={{ 
                        fontSize: 15, 
                        color: theme.textSecondary, 
                        textAlign: 'center',
                      }}
                    >
                      Sign in to continue to your dashboard
                    </Text>
                  </View>

                  {/* Username/Email Input */}
                  <Input
                    label="Username or Email"
                    icon="person-outline"
                    placeholder="Enter username or email"
                    value={username}
                    onChangeText={(text: string) => {
                      setUsername(text);
                      setErrors((prev) => ({ ...prev, username: undefined }));
                    }}
                    error={errors.username}
                    autoCapitalize="none"
                    autoComplete="username"
                  />

                  {/* Password Input */}
                  <Input
                    label="Password"
                    icon="lock-closed-outline"
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={(text: string) => {
                      setPassword(text);
                      setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    error={errors.password}
                    secureTextEntry
                    autoComplete="password"
                    showPasswordToggle
                    passwordVisible={showPassword}
                    onTogglePassword={() => setShowPassword(!showPassword)}
                  />

                  {/* Forgot Password */}
                  <TouchableOpacity
                    onPress={() => router.push("/(auth)/forgot-password")}
                    className="self-end mb-8"
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 14, color: theme.primary, fontWeight: '600' }}>
                      Forgot password?
                    </Text>
                  </TouchableOpacity>

                  {/* Login Button */}
                  <Button
                    title="Sign In"
                    onPress={handleLogin}
                    loading={loading}
                    icon="log-in-outline"
                    fullWidth
                    variant="primary"
                    size="large"
                  />
                </View>

                {/* Sign Up Link */}
                <View className="items-center mt-8">
                  <View className="flex-row items-center">
                    <Text className="text-[15px] text-white/90 font-normal">
                      Don&apos;t have an account?{" "}
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push("/(auth)/register")}
                      activeOpacity={0.7}
                    >
                      <Text className="text-[15px] text-white font-bold underline">Sign up</Text>
                    </TouchableOpacity>
                  </View>
                </View>
            </View>
          </KeyboardAwareScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
