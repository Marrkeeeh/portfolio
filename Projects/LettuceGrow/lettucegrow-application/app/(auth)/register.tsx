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

export default function RegisterScreen() {
  console.log("📝 RegisterScreen rendering...");
  
  const { register } = useAuth();
  const { theme, colorScheme } = useAppearance();
  
  console.log("📝 RegisterScreen - theme loaded:", !!theme, "colorScheme:", colorScheme);
  
  // Theme-aware gradient colors - much darker for dark mode
  const gradientColors = colorScheme === 'dark' 
    ? ["#0a1f1a", "#0d2e24", "#064e3b", "#065f46"] as const // Very dark green gradient for dark mode
    : ["#10b981", "#059669", "#047857", "#065f46"] as const; // Original bright gradient for light mode

  const [fname, setFname] = useState("");
  const [mname, setMname] = useState("");
  const [lname, setLname] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    fname?: string;
    lname?: string;
    username?: string;
    email?: string;
    phone?: string;
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

    if (!fname.trim()) {
      newErrors.fname = "First name is required";
    }

    if (!lname.trim()) {
      newErrors.lname = "Last name is required";
    }

    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email";
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

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await register({
        fname: fname.trim(),
        mname: mname.trim() || undefined,
        lname: lname.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        password_confirmation: confirmPassword,
        phonenumber: phone.trim() || undefined,
        address: address.trim() || undefined,
      });

      if (result.success) {
        if (result.requiresEmailVerification) {
          router.replace("/(auth)/verify-email" as any);
        } else {
          // Wait a bit for auth state to update
          await new Promise(resolve => setTimeout(resolve, 500));
          // Navigate directly to the app dashboard
          router.replace("/(app)/(drawer)/(tabs)" as any);
        }
      } else {
        setErrors({ email: result.error || "Registration failed. Please try again." });
      }
    } catch (error: any) {
      setErrors({ email: error.message || "An unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = password ? checkPasswordStrength(password) : 0;

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
        <View className="absolute w-[150px] h-[150px] rounded-full bg-white/5 top-[50%] -right-[30px]" />

        <SafeAreaView className="flex-1" edges={["top"]}>
          <KeyboardAwareScrollView>
            <View className="px-6 pt-8 pb-8">
                {/* Logo and Header */}
                <View className="items-center mb-10">
                  <Logo size="medium" className="mb-5" />
                  <Text className="text-[36px] font-extrabold text-white mb-2 tracking-wide">
                    LettuceGrow
                  </Text>
                  <Text className="text-base text-white/90 text-center font-normal">
                    Smart Hydroponics Monitoring System
                  </Text>
                </View>

                {/* Register Form Card */}
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
                      Create Account
                    </Text>
                    <Text 
                      style={{ 
                        fontSize: 15, 
                        color: theme.textSecondary, 
                        textAlign: 'center',
                      }}
                    >
                      Join the smart farming revolution
                    </Text>
                  </View>

                  {/* Username Input */}
                  <Input
                    label="Username"
                    icon="person-outline"
                    placeholder="johndoe"
                    value={username}
                    onChangeText={(text: string) => {
                      setUsername(text);
                      setErrors((prev) => ({ ...prev, username: undefined }));
                    }}
                    error={errors.username}
                    autoCapitalize="none"
                    containerStyle={{ marginBottom: 16 }}
                  />

                  {/* Name Inputs */}
                  <View className="flex-row gap-3 mb-4">
                    <View className="flex-1">
                      <Input
                        label="First Name"
                        icon="person-outline"
                        placeholder="John"
                        value={fname}
                        onChangeText={(text: string) => {
                          setFname(text);
                          setErrors((prev) => ({ ...prev, fname: undefined }));
                        }}
                        error={errors.fname}
                        autoCapitalize="words"
                        containerStyle={{ marginBottom: 0 }}
                      />
                    </View>
                    <View className="flex-1">
                      <Input
                        label="Last Name"
                        icon="person-outline"
                        placeholder="Doe"
                        value={lname}
                        onChangeText={(text: string) => {
                          setLname(text);
                          setErrors((prev) => ({ ...prev, lname: undefined }));
                        }}
                        error={errors.lname}
                        autoCapitalize="words"
                        containerStyle={{ marginBottom: 0 }}
                      />
                    </View>
                  </View>

                  {/* Middle Name Input (Optional) */}
                  <Input
                    label="Middle Name (Optional)"
                    icon="person-outline"
                    placeholder="A."
                    value={mname}
                    onChangeText={setMname}
                    autoCapitalize="words"
                    containerStyle={{ marginBottom: 16 }}
                  />

                  {/* Email Input */}
                  <Input
                    label="Email Address"
                    icon="mail-outline"
                    placeholder="john@example.com"
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
                  />

                  {/* Phone Input (Optional) */}
                  <Input
                    label="Phone Number (Optional)"
                    icon="call-outline"
                    placeholder="+1 (555) 123-4567"
                    value={phone}
                    onChangeText={(text: string) => {
                      setPhone(text);
                      setErrors((prev) => ({ ...prev, phone: undefined }));
                    }}
                    error={errors.phone}
                    keyboardType="phone-pad"
                    containerStyle={{ marginBottom: 16 }}
                  />

                  {/* Address Input (Optional) */}
                  <Input
                    label="Address (Optional)"
                    icon="location-outline"
                    placeholder="Your address"
                    value={address}
                    onChangeText={setAddress}
                    containerStyle={{ marginBottom: 16 }}
                  />

                  {/* Password Input */}
                  <View>
                    <Input
                      label="Password"
                      icon="lock-closed-outline"
                      placeholder="Create a strong password"
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
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChangeText={(text: string) => {
                      setConfirmPassword(text);
                      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }}
                    error={errors.confirmPassword}
                    secureTextEntry
                    autoComplete="password"
                    showPasswordToggle
                    passwordVisible={showConfirmPassword}
                    onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                    containerStyle={{ marginBottom: 24 }}
                  />

                  {/* Register Button */}
                  <Button
                    title="Create Account"
                    onPress={handleRegister}
                    loading={loading}
                    icon="person-add-outline"
                    fullWidth
                    variant="primary"
                    size="large"
                  />
                </View>

                {/* Sign In Link */}
                <View className="items-center mt-8">
                  <View className="flex-row items-center">
                    <Text className="text-[15px] text-white/90 font-normal">
                      Already have an account?{" "}
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push("/(auth)/login")}
                      activeOpacity={0.7}
                    >
                      <Text className="text-[15px] text-white font-bold underline">Sign in</Text>
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
