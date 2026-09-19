import { AppearanceProvider } from "@/contexts/AppearanceContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import "@/global.css";
import { usePushNotifications } from "@/modules/PushNotification";
import { Stack } from "expo-router";
import React, { Component, ErrorInfo, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("❌ RootLayout Error:", error);
    console.error("❌ Error Info:", errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{this.state.error?.message}</Text>
          <Text style={styles.errorStack}>{this.state.error?.stack}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#ff0000",
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: "#ffffff",
    marginBottom: 10,
  },
  errorStack: {
    fontSize: 12,
    color: "#ffffff",
    fontFamily: "monospace",
  },
});

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

function PushNotificationsRegistrar() {
  const { user, token } = useAuth();

  usePushNotifications(
    {
      apiBaseUrl: API_BASE_URL,
      apiToken: token || undefined,
      enabled: !!token,
    },
    user?.id,
  );

  return null;
}

export default function RootLayout() {
  console.log("🚀 RootLayout rendering...");
  
  return (
    <ErrorBoundary>
      <AppearanceProvider>
        <AuthProvider>
          <NotificationProvider>
            <PushNotificationsRegistrar />
            <Stack
              screenOptions={{
                headerShown: false,
              }}
            />
          </NotificationProvider>
        </AuthProvider>
      </AppearanceProvider>
    </ErrorBoundary>
  );
}
