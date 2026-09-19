import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  listDeviceShares,
  searchUsersToShare,
  shareDevice,
  unshareDevice,
  type SharedUser,
} from "../../services/deviceService";

type DeviceShareModalProps = {
  visible: boolean;
  deviceId: number;
  token: string;
  theme: any;
  colorScheme: string | null | undefined;
  onClose: () => void;
  onShareSuccess?: () => void;
};

export function DeviceShareModal({
  visible,
  deviceId,
  token,
  theme,
  colorScheme,
  onClose,
  onShareSuccess,
}: DeviceShareModalProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [sharedUsers, setSharedUsers] = React.useState<SharedUser[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isLoadingShares, setIsLoadingShares] = React.useState(false);
  const [isSharing, setIsSharing] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      loadSharedUsers();
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [visible, deviceId]);

  React.useEffect(() => {
    if (searchQuery.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchUsers();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadSharedUsers = async () => {
    setIsLoadingShares(true);
    try {
      const response = await listDeviceShares(deviceId, token);
      if (response.success && response.data) {
        setSharedUsers(response.data.shared_users);
      }
    } catch (error) {
      console.error("Failed to load shared users:", error);
    } finally {
      setIsLoadingShares(false);
    }
  };

  const searchUsers = async () => {
    setIsSearching(true);
    try {
      const response = await searchUsersToShare(deviceId, searchQuery, token);
      if (response.success && response.data) {
        setSearchResults(response.data.users);
      }
    } catch (error) {
      console.error("Failed to search users:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleShare = async (userId: number) => {
    setIsSharing(true);
    try {
      const response = await shareDevice(deviceId, userId, token);
      if (response.success) {
        setSearchQuery("");
        setSearchResults([]);
        await loadSharedUsers();
        onShareSuccess?.();
      }
    } catch (error: any) {
      console.error("Failed to share device:", error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleUnshare = async (userId: number) => {
    try {
      const response = await unshareDevice(deviceId, userId, token);
      if (response.success) {
        await loadSharedUsers();
        onShareSuccess?.();
      }
    } catch (error) {
      console.error("Failed to unshare device:", error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: theme.background,
        }}
        edges={["top"]}
      >
        {/* Header - Fixed */}
        <View
          style={{
            paddingBottom: 16,
            paddingHorizontal: 20,
            backgroundColor: theme.background,
            borderBottomWidth: 1,
            borderBottomColor: theme.borderLight,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "700",
                  color: theme.text,
                  marginBottom: 4,
                }}
              >
                Share Device
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.textSecondary,
                }}
              >
                Share access with other users
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colorScheme === "dark" ? "#1e293b" : "#f1f5f9",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          showsVerticalScrollIndicator={true}
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            paddingBottom: 30,
            paddingTop: 20,
            paddingHorizontal: 20,
          }}
        >
          {/* Search Input */}
          <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: theme.text,
                  marginBottom: 10,
                }}
              >
                Search Users
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor:
                    colorScheme === "dark" ? "#1e293b" : "#f1f5f9",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: theme.borderLight,
                }}
              >
                <Ionicons
                  name="search"
                  size={20}
                  color={theme.textSecondary}
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search by username, email, or name..."
                  placeholderTextColor={theme.textTertiary}
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: theme.text,
                  }}
                />
                {isSearching && (
                  <ActivityIndicator size="small" color={theme.primary} />
                )}
              </View>
            </View>

          {/* Search Results */}
          {searchQuery.length >= 2 && searchResults.length > 0 && (
            <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: theme.text,
                    marginBottom: 12,
                  }}
                >
                  Search Results
                </Text>
                {searchResults.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleShare(item.id)}
                    disabled={isSharing}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 14,
                      backgroundColor:
                        colorScheme === "dark" ? "#1e293b" : "#f8fafc",
                      borderRadius: 12,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: theme.borderLight,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: theme.primary + "20",
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 12,
                      }}
                    >
                      <Ionicons
                        name="person"
                        size={22}
                        color={theme.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: theme.text,
                          marginBottom: 2,
                        }}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: theme.textSecondary,
                        }}
                        numberOfLines={1}
                      >
                        @{item.username}
                        {item.email ? ` • ${item.email}` : ""}
                      </Text>
                    </View>
                    {isSharing ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: theme.primary + "20",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons
                          name="add"
                          size={20}
                          color={theme.primary}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

          {/* Shared Users List */}
          <View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: theme.text,
                  }}
                >
                  Shared With
                </Text>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: theme.primary + "20",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: theme.primary,
                    }}
                  >
                    {sharedUsers.length}
                  </Text>
                </View>
              </View>

              {isLoadingShares ? (
                <View style={{ padding: 40, alignItems: "center" }}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              ) : sharedUsers.length === 0 ? (
                <View
                  style={{
                    padding: 32,
                    alignItems: "center",
                    backgroundColor:
                      colorScheme === "dark" ? "#1e293b" : "#f8fafc",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.borderLight,
                    borderStyle: "dashed",
                  }}
                >
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: theme.primary + "15",
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <Ionicons
                      name="people-outline"
                      size={32}
                      color={theme.primary}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: theme.text,
                      marginBottom: 6,
                    }}
                  >
                    No users shared yet
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: theme.textSecondary,
                      textAlign: "center",
                    }}
                  >
                    Search above to share this device with someone
                  </Text>
                </View>
              ) : (
                sharedUsers.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 14,
                      backgroundColor:
                        colorScheme === "dark" ? "#1e293b" : "#f8fafc",
                      borderRadius: 12,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: theme.borderLight,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: theme.primary + "20",
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 12,
                      }}
                    >
                      <Ionicons
                        name="person"
                        size={22}
                        color={theme.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: theme.text,
                          marginBottom: 2,
                        }}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: theme.textSecondary,
                          marginBottom: 4,
                        }}
                        numberOfLines={1}
                      >
                        @{item.username}
                        {item.email ? ` • ${item.email}` : ""}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: theme.textTertiary,
                        }}
                      >
                        Shared {new Date(item.shared_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleUnshare(item.id)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: theme.error + "20",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={theme.error}
                      />
                    </TouchableOpacity>
                  </View>
                ))
              )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
