import { Logo } from "@/components/ui";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useAuth } from "@/contexts/AuthContext";
import "@/global.css";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const FEATURES = [
  {
    icon: "leaf-outline" as const,
    title: "Smart Monitoring",
    description: "Real-time tracking with advanced sensors",
    iconColor: "#10b981",
  },
  {
    icon: "analytics-outline" as const,
    title: "Data Analytics",
    description: "Comprehensive insights to optimize growth",
    iconColor: "#3b82f6",
  },
  {
    icon: "notifications-outline" as const,
    title: "Smart Alerts",
    description: "Instant notifications for system status",
    iconColor: "#f59e0b",
  },
  {
    icon: "water-outline" as const,
    title: "Automated Control",
    description: "Automate nutrient delivery and controls",
    iconColor: "#06b6d4",
  },
];

const STATS = [
  { value: "24/7", label: "Monitoring", icon: "time-outline" as const },
  { value: "99%", label: "Accuracy", icon: "checkmark-circle-outline" as const },
  { value: "50+", label: "Users", icon: "people-outline" as const },
];

export default function LandingPage() {
  console.log("🎯 LandingPage rendering...");
  
  const insets = useSafeAreaInsets();
  const { theme, colorScheme } = useAppearance();
  const { isAuthenticated, isLoading } = useAuth();
  
  console.log("🎯 LandingPage - theme loaded:", !!theme, "colorScheme:", colorScheme);
  console.log("🎯 LandingPage - isAuthenticated:", isAuthenticated, "isLoading:", isLoading);

  // Redirect authenticated users to the app
  useFocusEffect(
    React.useCallback(() => {
      if (!isLoading && isAuthenticated) {
        console.log("🎯 User is authenticated, redirecting to app...");
        router.replace("/(app)/(drawer)/(tabs)" as any);
      }
    }, [isAuthenticated, isLoading])
  );

  // While auth is loading, or once authenticated (until navigation completes),
  // show a dedicated loading screen instead of flashing the landing UI.
  if (isLoading || isAuthenticated) {
    const backgroundColor = colorScheme === 'dark' ? "#0a1f1a" : "#10b981";
    const statusBarColor = colorScheme === 'dark' ? "#0a1f1a" : "#059669";

    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor }}>
        <StatusBar barStyle="light-content" backgroundColor={statusBarColor} />
        <Logo />
        <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 24 }} />
        <Text style={{ color: '#ffffff', marginTop: 12, fontSize: 16 }}>
          Loading...
        </Text>
      </View>
    );
  }

  // Theme-aware gradient colors - much darker for dark mode, bright for light mode
  const gradientColors = colorScheme === 'dark' 
    ? ["#0a1f1a", "#0d2e24", "#064e3b", "#065f46"] as const // Very dark green gradient for dark mode
    : ["#10b981", "#059669", "#047857", "#065f46"] as const; // Original bright gradient for light mode

  // Decorative elements opacity - more subtle in dark mode
  const decorativeOpacity = colorScheme === 'dark' ? 0.02 : 0.06;

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
        <View 
          className="absolute w-[350px] h-[350px] rounded-full -top-[120px] -right-[120px]"
          style={{ backgroundColor: `rgba(255, 255, 255, ${decorativeOpacity})` }}
        />
        <View 
          className="absolute w-[280px] h-[280px] rounded-full bottom-[150px] -left-[80px]"
          style={{ backgroundColor: `rgba(255, 255, 255, ${decorativeOpacity * 0.83})` }}
        />
        <View 
          className="absolute w-[200px] h-[200px] rounded-full top-[45%] right-[20px]"
          style={{ backgroundColor: `rgba(255, 255, 255, ${decorativeOpacity * 0.67})` }}
        />

        <SafeAreaView className="flex-1" edges={["top"]}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Section */}
            <View className="px-6 pt-10 pb-8">
              <View className="flex-row items-start justify-between mb-6">
                <View className="flex-1 pr-6">
                  <Text className="text-[44px] font-extrabold text-white mb-3 leading-[1.1] tracking-tight">
                    Grow Smarter,{"\n"}Not Harder
                  </Text>
                  <Text className="text-base text-white/90 mb-6 leading-6">
                    LettuceGrow transforms hydroponic farming with intelligent automation
                  </Text>
                  {/* Stats Badges */}
                  <View className="flex-row gap-2 flex-wrap">
                    {STATS.map((stat, index) => (
                      <View
                        key={index}
                        className="rounded-full px-3.5 py-2 flex-row items-center"
                        style={{
                          backgroundColor: colorScheme === 'dark' 
                            ? 'rgba(255, 255, 255, 0.1)' 
                            : 'rgba(255, 255, 255, 0.15)',
                        }}
                      >
                        <Ionicons name={stat.icon} size={14} color="#ffffff" />
                        <Text className="text-white font-bold ml-1.5 text-xs">
                          {stat.value}
                        </Text>
                        <Text className="text-white/85 ml-1 text-[10px]">{stat.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                {/* Logo */}
                <Logo size="large" />
              </View>

              {/* CTA Buttons */}
              <View className="flex-row gap-3 mt-4">
                <TouchableOpacity
                  onPress={() => router.push("/(auth)/register")}
                  className="flex-1 rounded-2xl py-4 px-6 items-center justify-center shadow-2xl active:opacity-90"
                  style={{
                    backgroundColor: colorScheme === 'dark' ? theme.background : '#ffffff',
                  }}
                  activeOpacity={0.9}
                >
                  <View className="flex-row items-center">
                    <Ionicons 
                      name="rocket-outline" 
                      size={20} 
                      color={colorScheme === 'dark' ? theme.primary : "#059669"} 
                    />
                    <Text 
                      style={{
                        color: colorScheme === 'dark' ? theme.primary : "#059669",
                        fontSize: 16,
                        fontWeight: 'bold',
                        marginLeft: 8,
                      }}
                    >
                      Get Started
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push("/(auth)/login")}
                  className="w-14 h-14 rounded-2xl items-center justify-center border-2 active:opacity-90"
                  style={{
                    backgroundColor: colorScheme === 'dark' ? theme.background + '40' : 'rgba(255, 255, 255, 0.15)',
                    borderColor: colorScheme === 'dark' ? theme.border : 'rgba(255, 255, 255, 0.3)',
                  }}
                  activeOpacity={0.9}
                >
                  <Ionicons name="log-in-outline" size={22} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Features Section */}
            <View className="px-6 mb-10">
              <View className="mb-6">
                <Text className="text-[28px] font-extrabold text-white mb-2">
                  Everything You Need
                </Text>
                <Text className="text-sm text-white/85">
                  Powerful features for modern hydroponic farming
                </Text>
              </View>

              <View className="gap-4">
                {FEATURES.map((feature, index) => (
                  <View
                    key={index}
                    className={`flex-row ${index % 2 === 1 ? "flex-row-reverse" : ""}`}
                  >
                    <View
                      className={`flex-1 ${index % 2 === 1 ? "ml-3" : "mr-3"}`}
                    >
                      <View 
                        className="rounded-2xl p-5 shadow-lg border"
                        style={{
                          backgroundColor: theme.background,
                          borderColor: theme.borderLight,
                        }}
                      >
                        <View
                          className={`flex-row items-start ${index % 2 === 1 ? "flex-row-reverse" : ""}`}
                        >
                          <View
                            className={`rounded-xl p-3 ${index % 2 === 1 ? "ml-3" : "mr-3"}`}
                            style={{
                              backgroundColor: `${feature.iconColor}20`,
                            }}
                          >
                            <Ionicons name={feature.icon} size={28} color={feature.iconColor} />
                          </View>
                          <View className="flex-1">
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 6 }}>
                              {feature.title}
                            </Text>
                            <Text style={{ fontSize: 14, color: theme.textSecondary, lineHeight: 20 }}>
                              {feature.description}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Bottom CTA Section */}
            <View className="px-6 mb-8">
              <View 
                className="rounded-3xl p-7 shadow-2xl border"
                style={{
                  backgroundColor: theme.background,
                  borderColor: theme.borderLight,
                }}
              >
                <Text style={{ fontSize: 24, fontWeight: '800', color: theme.text, marginBottom: 8, textAlign: 'center' }}>
                  Ready to Start Growing?
                </Text>
                <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: 'center', marginBottom: 24 }}>
                  Join growers worldwide who trust LettuceGrow
                </Text>

                <View className="flex-row gap-3 mb-6">
                  <TouchableOpacity
                    onPress={() => router.push("/(auth)/register")}
                    className="flex-1 rounded-xl py-4 px-6 items-center justify-center shadow-lg active:opacity-90"
                    style={{ backgroundColor: theme.primary }}
                    activeOpacity={0.9}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>Register</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push("/(auth)/login")}
                    className="flex-1 rounded-xl py-4 px-6 items-center justify-center border-2 active:opacity-90"
                    style={{ 
                      backgroundColor: theme.background,
                      borderColor: theme.primary,
                    }}
                    activeOpacity={0.9}
                  >
                    <Text style={{ color: theme.primary, fontSize: 16, fontWeight: 'bold' }}>Sign In</Text>
                  </TouchableOpacity>
                </View>

                {/* Trust Indicators */}
                <View 
                  className="flex-row justify-center items-center flex-wrap gap-4 pt-5 border-t"
                  style={{ borderTopColor: theme.border }}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="shield-checkmark" size={16} color={theme.primary} />
                    <Text style={{ color: theme.textSecondary, fontSize: 12, marginLeft: 6, fontWeight: '500' }}>
                      Secure Platform
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="flash" size={16} color={theme.primary} />
                    <Text style={{ color: theme.textSecondary, fontSize: 12, marginLeft: 6, fontWeight: '500' }}>
                      Real-time Data
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="headset" size={16} color={theme.primary} />
                    <Text style={{ color: theme.textSecondary, fontSize: 12, marginLeft: 6, fontWeight: '500' }}>
                      24/7 Support
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
