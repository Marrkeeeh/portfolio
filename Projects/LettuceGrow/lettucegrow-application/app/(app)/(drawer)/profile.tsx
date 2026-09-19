import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useDialog } from "@/components/ui";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useAuth } from "@/contexts/AuthContext";
import "@/global.css";
import { useProfile } from "@/hooks/useProfile";
import type { ProfileUpdateData } from "@/services/profileService";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React from "react";
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const { logout, user: authUser } = useAuth();
  const { theme } = useAppearance();
  const { profile, loading, error, refreshProfile, updateProfileData, uploadProfileImage } = useProfile();
  const { confirm, showDialog, Dialog: DialogComponent } = useDialog();

  const [formData, setFormData] = React.useState({
    fname: profile?.fname || "",
    mname: profile?.mname || "",
    lname: profile?.lname || "",
    username: profile?.username || "",
    email: profile?.email || "",
    phonenumber: profile?.phonenumber || "",
    address: profile?.address || "",
  });
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    if (profile) {
      setFormData({
        fname: profile.fname || "",
        mname: profile.mname || "",
        lname: profile.lname || "",
        username: profile.username || "",
        email: profile.email || "",
        phonenumber: profile.phonenumber || "",
        address: profile.address || "",
      });
      setIsEditing(false);
      setIsEditMode(false);
    }
  }, [profile]);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  }, [refreshProfile]);

  const handleLogout = async () => {
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

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.status !== "granted") {
      showDialog({
        title: "Permission required",
        message: "We need access to your photos to update your profile picture.",
        icon: "alert-circle-outline",
        iconColor: theme.warning || theme.error,
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    if (!asset.uri) {
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const outcome = await uploadProfileImage(asset.uri);
      if (!outcome.success) {
        showDialog({
          title: "Upload failed",
          message: outcome.error || "Please try again.",
          icon: "alert-circle-outline",
          iconColor: theme.error,
        });
      } else {
        showDialog({
          title: "Profile picture updated",
          message: outcome.message || "Your profile picture has been updated.",
          icon: "checkmark-circle-outline",
          iconColor: theme.success || theme.primary,
        });
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleStartEdit = () => {
    if (!profile) {
      return;
    }

    setFormData({
      fname: profile.fname || "",
      mname: profile.mname || "",
      lname: profile.lname || "",
      username: profile.username || "",
      email: profile.email || "",
      phonenumber: profile.phonenumber || "",
      address: profile.address || "",
    });
    setIsEditMode(true);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    if (profile) {
      setFormData({
        fname: profile.fname || "",
        mname: profile.mname || "",
        lname: profile.lname || "",
        username: profile.username || "",
        email: profile.email || "",
        phonenumber: profile.phonenumber || "",
        address: profile.address || "",
      });
    }
    setIsEditMode(false);
    setIsEditing(false);
  };

  const handleChange = (field: keyof ProfileUpdateData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!profile) {
      return;
    }

    const trimmedFname = formData.fname.trim();
    const trimmedLname = formData.lname.trim();
    const trimmedUsername = formData.username.trim();

    if (!trimmedFname || !trimmedLname || !trimmedUsername) {
      showDialog({
        title: "Missing information",
        message: "First name, last name, and username are required.",
        icon: "alert-circle-outline",
        iconColor: theme.warning || theme.error,
      });
      return;
    }

    const payload: ProfileUpdateData = {
      fname: trimmedFname,
      lname: trimmedLname,
      username: trimmedUsername,
      mname: formData.mname.trim() || null,
      email: formData.email.trim() || null,
      phonenumber: formData.phonenumber.trim() || null,
      address: formData.address.trim() || null,
    };

    try {
      setIsSaving(true);
      const result = await updateProfileData(payload);

      if (!result.success) {
        showDialog({
          title: "Profile update failed",
          message: result.error || "Please try again.",
          icon: "alert-circle-outline",
          iconColor: theme.error,
        });
      } else {
        setIsEditing(false);
        setIsEditMode(false);
        showDialog({
          title: "Profile updated",
          message: result.message || "Your profile has been updated.",
          icon: "checkmark-circle-outline",
          iconColor: theme.success || theme.primary,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getUserDisplayName = () => {
    if (!profile) return "User";
    
    if (profile.full_name) {
      return profile.full_name;
    }
    
    const nameParts = [
      profile.fname,
      profile.mname,
      profile.lname,
    ].filter(Boolean);
    
    if (nameParts.length > 0) {
      return nameParts.join(" ");
    }
    
    return profile.username || "User";
  };

  const getProfileImageUri = () => {
    const rawImage = profile?.profile_img || authUser?.profile_img;

    if (rawImage) {
      let imagePath = rawImage.trim();

      if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
        return imagePath;
      }

      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

      if (!imagePath.startsWith("/")) {
        imagePath = `/${imagePath}`;
      }

      if (imagePath.startsWith("/uploads/")) {
        return `${API_BASE_URL}${imagePath}`;
      }

      if (imagePath.startsWith("/storage/")) {
        return `${API_BASE_URL}${imagePath}`;
      }

      if (imagePath.startsWith("/profiles/")) {
        return `${API_BASE_URL}/storage${imagePath}`;
      }

      return `${API_BASE_URL}/uploads${imagePath}`;
    }
    return null;
  };

  if (loading && !profile) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}
        edges={["bottom", "left", "right"]}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 16 }}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !profile) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}
        edges={["bottom", "left", "right"]}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.error} />
          <Text style={{ color: theme.error, textAlign: 'center', marginTop: 16, marginBottom: 16, fontSize: 16 }}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={refreshProfile}
            style={{ backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 }}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#ffffff', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <DialogComponent />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}
        edges={["bottom", "left", "right"]}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          <View style={{ paddingHorizontal: 16 }}>
            {/* Profile Header Card */}
            <View
              style={{
                backgroundColor: theme.background,
                borderRadius: 20,
                padding: 24,
                marginTop: 16,
                marginBottom: 16,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View style={{ position: 'relative', marginBottom: 16 }}>
                {getProfileImageUri() ? (
                  <Image
                    source={{ uri: getProfileImageUri()! }}
                    style={{ width: 120, height: 120, borderRadius: 60 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 60,
                      backgroundColor: theme.backgroundTertiary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="person" size={64} color={theme.primary} />
                  </View>
                )}
                <TouchableOpacity
                  onPress={handlePickImage}
                  disabled={isUploadingAvatar}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: theme.primary,
                    borderWidth: 4,
                    borderColor: theme.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isUploadingAvatar ? 0.7 : 1,
                  }}
                  activeOpacity={0.7}
                >
                  {isUploadingAvatar ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons name="camera" size={20} color="#ffffff" />
                  )}
                </TouchableOpacity>
              </View>
              
              <Text style={{ fontSize: 26, fontWeight: '700', color: theme.text, marginBottom: 4, textAlign: 'center' }}>
                {getUserDisplayName()}
              </Text>
              <Text style={{ fontSize: 16, color: theme.textSecondary, marginBottom: 8 }}>
                @{profile?.username}
              </Text>
              {profile?.email && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Ionicons name="mail-outline" size={16} color={theme.textTertiary} style={{ marginRight: 6 }} />
                  <Text style={{ color: theme.textTertiary, fontSize: 14 }}>
                    {profile.email}
                  </Text>
                </View>
              )}
            </View>

            {/* Profile Information Card */}
            <View
              style={{
                backgroundColor: theme.background,
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text }}>
                  Personal Information
                </Text>
                {!isEditMode && (
                  <TouchableOpacity
                    onPress={handleStartEdit}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: theme.primary + '15',
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={18} color={theme.primary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Name Fields */}
              <View style={{ marginBottom: 20 }}>
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    First Name
                  </Text>
                  {isEditMode ? (
                    <Input
                      value={formData.fname}
                      onChangeText={(text) => handleChange("fname", text)}
                      placeholder="First name"
                      autoCapitalize="words"
                      containerStyle={{ marginBottom: 0 }}
                    />
                  ) : (
                    <Text style={{ fontSize: 16, color: theme.text, fontWeight: '500' }}>
                      {profile?.fname || "—"}
                    </Text>
                  )}
                </View>

                {(isEditMode || profile?.mname) && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Middle Name
                    </Text>
                    {isEditMode ? (
                      <Input
                        value={formData.mname}
                        onChangeText={(text) => handleChange("mname", text)}
                        placeholder="Middle name (optional)"
                        autoCapitalize="words"
                        containerStyle={{ marginBottom: 0 }}
                      />
                    ) : (
                      <Text style={{ fontSize: 16, color: theme.text, fontWeight: '500' }}>
                        {profile?.mname || "—"}
                      </Text>
                    )}
                  </View>
                )}

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Last Name
                  </Text>
                  {isEditMode ? (
                    <Input
                      value={formData.lname}
                      onChangeText={(text) => handleChange("lname", text)}
                      placeholder="Last name"
                      autoCapitalize="words"
                      containerStyle={{ marginBottom: 0 }}
                    />
                  ) : (
                    <Text style={{ fontSize: 16, color: theme.text, fontWeight: '500' }}>
                      {profile?.lname || "—"}
                    </Text>
                  )}
                </View>
              </View>

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 20 }} />

              {/* Account Details */}
              <View>
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Username
                  </Text>
                  {isEditMode ? (
                    <Input
                      value={formData.username}
                      onChangeText={(text) => handleChange("username", text)}
                      placeholder="Username"
                      autoCapitalize="none"
                      containerStyle={{ marginBottom: 0 }}
                    />
                  ) : (
                    <Text style={{ fontSize: 16, color: theme.text, fontWeight: '500' }}>
                      @{profile?.username || "—"}
                    </Text>
                  )}
                </View>

                {(isEditMode || profile?.email) && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Email
                    </Text>
                    {isEditMode ? (
                      <Input
                        value={formData.email}
                        onChangeText={(text) => handleChange("email", text)}
                        placeholder="Email address (optional)"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        containerStyle={{ marginBottom: 0 }}
                      />
                    ) : (
                      <Text style={{ fontSize: 16, color: theme.text, fontWeight: '500' }}>
                        {profile?.email || "—"}
                      </Text>
                    )}
                  </View>
                )}

                {(isEditMode || profile?.phonenumber) && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Phone Number
                    </Text>
                    {isEditMode ? (
                      <Input
                        value={formData.phonenumber}
                        onChangeText={(text) => handleChange("phonenumber", text)}
                        placeholder="Phone number (optional)"
                        keyboardType="phone-pad"
                        containerStyle={{ marginBottom: 0 }}
                      />
                    ) : (
                      <Text style={{ fontSize: 16, color: theme.text, fontWeight: '500' }}>
                        {profile?.phonenumber || "—"}
                      </Text>
                    )}
                  </View>
                )}

                {(isEditMode || profile?.address) && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Address
                    </Text>
                    {isEditMode ? (
                      <Input
                        value={formData.address}
                        onChangeText={(text) => handleChange("address", text)}
                        placeholder="Address (optional)"
                        multiline
                        numberOfLines={3}
                        inputStyle={{ textAlignVertical: 'top', minHeight: 80 }}
                        containerStyle={{ marginBottom: 0 }}
                      />
                    ) : (
                      <Text style={{ fontSize: 16, color: theme.text, fontWeight: '500', lineHeight: 24 }}>
                        {profile?.address || "—"}
                      </Text>
                    )}
                  </View>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={theme.primary} style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 8 }}>
                    Role
                  </Text>
                  <Text style={{ fontSize: 16, color: theme.text, fontWeight: '600', textTransform: 'capitalize' }}>
                    {profile?.role || "—"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Account Status Card */}
            <View
              style={{
                backgroundColor: theme.background,
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text, marginBottom: 16 }}>
                Account Status
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons
                  name={profile?.email_verified ? "checkmark-circle" : "close-circle"}
                  size={24}
                  color={profile?.email_verified ? theme.success : theme.error}
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 2 }}>
                    Email {profile?.email_verified ? "Verified" : "Not Verified"}
                  </Text>
                  <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                    {profile?.email_verified
                      ? "Your email address has been verified"
                      : "Please verify your email address"}
                  </Text>
                </View>
              </View>
              {profile?.two_factor_enabled && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <Ionicons name="shield-checkmark" size={24} color={theme.primary} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 2 }}>
                      Two-Factor Authentication
                    </Text>
                    <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                      Enhanced security is enabled
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            {isEditMode ? (
              <View style={{ marginBottom: 16 }}>
                <Button
                  title="Save Changes"
                  variant="primary"
                  size="medium"
                  icon="save-outline"
                  loading={isSaving}
                  disabled={!isEditing || isSaving}
                  fullWidth
                  onPress={handleSave}
                  containerStyle={{ marginBottom: 12 }}
                />
                <Button
                  title="Cancel"
                  variant="outline"
                  size="medium"
                  icon="close-circle-outline"
                  fullWidth
                  disabled={isSaving}
                  onPress={handleCancelEdit}
                />
              </View>
            ) : (
              <View style={{ marginBottom: 16 }}>
                <Button
                  title="Edit Profile"
                  variant="primary"
                  size="medium"
                  icon="create-outline"
                  fullWidth
                  onPress={handleStartEdit}
                  containerStyle={{ marginBottom: 16 }}
                />
                <Button
                  title={isLoggingOut ? "Logging out..." : "Logout"}
                  variant="danger"
                  size="medium"
                  icon="log-out-outline"
                  fullWidth
                  loading={isLoggingOut}
                  disabled={isLoggingOut}
                  onPress={handleLogout}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
