import Logo from "@/components/Logo";
import { useDialog } from "@/components/ui";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useAuth } from "@/contexts/AuthContext";
import "@/global.css";
import { Ionicons } from "@expo/vector-icons";
import { DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import { router } from "expo-router";
import React from "react";
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export default function CustomDrawerContent(props: any) {
  const { user, logout } = useAuth();
  const { theme } = useAppearance();
  const insets = useSafeAreaInsets();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const { confirm, showDialog, Dialog: DialogComponent } = useDialog();

  const handleLogout = async () => {
    // Show confirmation dialog
    const confirmed = await confirm({
      title: "Confirm Logout",
      message: "Are you sure you want to logout?",
      confirmText: "Logout",
      cancelText: "Cancel",
      confirmVariant: "danger",
      cancelVariant: "secondary",
      icon: "log-out-outline",
      iconColor: theme.error,
    });

    if (!confirmed) {
      return;
    }

    setIsLoggingOut(true);
    try {
      const result = await logout();
      if (result.success) {
        router.replace("/(auth)/login");
      } else {
        showDialog({
          title: "Logout Failed",
          message: result.error || "Failed to logout. Please try again.",
          icon: "alert-circle-outline",
          iconColor: theme.error,
        });
      }
    } catch (error) {
      showDialog({
        title: "Error",
        message: "An unexpected error occurred during logout.",
        icon: "alert-circle-outline",
        iconColor: theme.error,
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Get user's display name (fname and lname)
  const getUserDisplayName = () => {
    if (!user) return "User";
    
    const nameParts = [
      user.fname,
      user.lname,
    ].filter(Boolean);
    
    if (nameParts.length > 0) {
      return nameParts.join(" ");
    }
    
    return user.username || "User";
  };

  // Get profile image URI
  const getProfileImageUri = () => {
    if (user?.profile_img) {
      let imagePath = user.profile_img.trim();

      // Already a full URL
      if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
        return imagePath;
      }

      // Ensure leading slash
      if (!imagePath.startsWith("/")) {
        imagePath = `/${imagePath}`;
      }

      // New scheme: public/uploads/...
      if (imagePath.startsWith("/uploads/")) {
        return `${API_BASE_URL}${imagePath}`;
      }

      // Storage scheme: /storage/...
      if (imagePath.startsWith("/storage/")) {
        return `${API_BASE_URL}${imagePath}`;
      }

      // Legacy storage path: profiles/... -> /storage/profiles/...
      if (imagePath.startsWith("/profiles/")) {
        return `${API_BASE_URL}/storage${imagePath}`;
      }

      // Fallback: treat as uploads path
      return `${API_BASE_URL}/uploads${imagePath}`;
    }
    return null;
  };

  return (
    <>
      <DialogComponent />
      <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header Section with Logo */}
      <View
        style={{
          paddingTop: Math.max(insets.top + 12, 44),
          paddingBottom: 16,
          paddingHorizontal: 16,
        }}
      >
        {/* Logo/Brand Section */}
        <View className="flex-row items-center mb-4">
          <View 
            style={{ 
              transform: [{ scale: 0.6 }],
              marginRight: 10,
            }}
          >
            <Logo size="small" />
          </View>
          <View className="flex-1">
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.primary }}>
              LettuceGrow
            </Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
              Grow Smarter, Not Harder
            </Text>
          </View>
        </View>

        {/* User Profile Card */}
        <View 
          className="flex-row items-center rounded-xl px-3 py-3"
          style={{
            backgroundColor: theme.backgroundTertiary,
          }}
        >
          {/* Avatar */}
          {getProfileImageUri() ? (
            <Image
              source={{ uri: getProfileImageUri()! }}
              className="w-10 h-10 rounded-full"
              resizeMode="cover"
            />
          ) : (
            <View 
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: theme.backgroundSecondary }}
            >
              <Ionicons name="person" size={20} color={theme.primary} />
            </View>
          )}

          {/* User Details */}
          <View className="flex-1 ml-3">
            <Text 
              style={{ fontSize: 14, fontWeight: '600', color: theme.text }}
              numberOfLines={1}
            >
              {getUserDisplayName()}
            </Text>
            {user?.email && (
              <Text 
                style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}
                numberOfLines={1}
              >
                {user.email}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Navigation Items */}
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: 4,
          paddingBottom: 8,
          paddingHorizontal: 4,
        }}
        showsVerticalScrollIndicator={false}
      >
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {/* Footer with Logout */}
      <View
        style={{
          paddingHorizontal: 12,
          paddingBottom: Math.max(insets.bottom + 8, 16),
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: theme.borderLight,
        }}
      >
        <TouchableOpacity
          onPress={handleLogout}
          disabled={isLoggingOut}
          className="flex-row items-center rounded-xl px-3 py-3"
          style={{
            backgroundColor: theme.error + '20', // 20% opacity
            opacity: isLoggingOut ? 0.6 : 1,
          }}
          activeOpacity={0.7}
        >
          <View 
            className="w-8 h-8 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: theme.error + '30' }}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color={theme.error} />
            ) : (
              <Ionicons name="log-out-outline" size={18} color={theme.error} />
            )}
          </View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.error }}>
            {isLoggingOut ? "Logging out..." : "Logout"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
    </>
  );
}

