import { DevicesAddForm } from "@/components/devices/DevicesAddForm";
import { DevicesEditForm } from "@/components/devices/DevicesEditForm";
import { DevicesHeader } from "@/components/devices/DevicesHeader";
import { DevicesList } from "@/components/devices/DevicesList";
import { DeviceShareModal } from "@/components/devices/DeviceShareModal";
import { mapSmartDeviceToListItem, type DeviceListItem } from "@/components/devices/types";
import { useDialog } from "@/components/ui";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useAuth } from "@/contexts/AuthContext";
import "@/global.css";
import React, { useCallback } from "react";
import { ScrollView, View, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { claimDevice, getDevicesForUser, removeDevice, updateDevice } from "../../../services/deviceService";

export default function DevicesScreen() {
  const { theme, colorScheme } = useAppearance();
  const { token } = useAuth();
  const { showDialog, confirm, Dialog: DialogComponent } = useDialog();

  const [devices, setDevices] = React.useState<DeviceListItem[]>([]);
  const [devicesLoading, setDevicesLoading] = React.useState(false);
  const [isAddingDevice, setIsAddingDevice] = React.useState(false);
  const [editingDevice, setEditingDevice] = React.useState<DeviceListItem | null>(null);
  const [deviceNameInput, setDeviceNameInput] = React.useState("");
  const [deviceCodeInput, setDeviceCodeInput] = React.useState("");
  const [devicePinInput, setDevicePinInput] = React.useState("");
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editLocation, setEditLocation] = React.useState("");
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);
  const [sharingDevice, setSharingDevice] = React.useState<DeviceListItem | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const connectedCount = React.useMemo(
    () => devices.filter((d) => d.status === "connected").length,
    [devices],
  );
  const totalDevices = devices.length;
  const offlineCount = Math.max(totalDevices - connectedCount, 0);

  // Function to load devices
  const loadDevices = useCallback(async () => {
    if (!token) {
      setDevices([]);
      return;
    }

    setDevicesLoading(true);

    try {
      const response = await getDevicesForUser(token);

      if (!response.success) {
        console.error('Failed to load devices:', response.error);
        setDevices([]);
        return;
      }

      if (!response.data || !Array.isArray(response.data.devices)) {
        console.error('Invalid response format:', response);
        setDevices([]);
        return;
      }

      const mapped = response.data.devices
        .map((device) => {
          try {
            return mapSmartDeviceToListItem(device);
          } catch (error) {
            console.error('Error mapping device:', device, error);
            return null;
          }
        })
        .filter((item): item is DeviceListItem => item !== null);
      
      console.log('Loaded devices:', mapped.length, 'from', response.data.devices.length, 'raw devices');
      setDevices(mapped);
    } catch (error: any) {
      showDialog({
        title: "Failed to load devices",
        message: error?.message || "Unable to load your devices. Please try again.",
        icon: "alert-circle-outline",
        iconColor: "#ef4444",
      });
    } finally {
      setDevicesLoading(false);
    }
  }, [token, showDialog]);

  // Initial load and when token changes
  React.useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDevices();
    setRefreshing(false);
  }, [loadDevices]);

  const handleStartAddDevice = () => {
    setIsAddingDevice(true);
    setDeviceNameInput("");
    setDeviceCodeInput("");
    setDevicePinInput("");
  };

  const handleCancelAddDevice = () => {
    setIsAddingDevice(false);
  };

  const handleShowDeviceDetails = (device: DeviceListItem) => {
    const lines = [
      `Device ID: ${device.deviceId}`,
      device.location ? `Location: ${device.location}` : "Location: Not set",
      `Status: ${device.status === "connected" ? "Connected" : "Disconnected"}`,
      `Last seen: ${device.lastSeen}`,
    ];

    showDialog({
      title: device.name,
      message: lines.join("\n"),
      icon: "information-circle-outline",
      iconColor: theme.info,
    });
  };

  const handleStartEditDevice = (device: DeviceListItem) => {
    setEditingDevice(device);
    setEditName(device.name);
    setEditLocation(device.location || "");
  };

  const handleCancelEditDevice = () => {
    setEditingDevice(null);
    setEditName("");
    setEditLocation("");
  };

  const handleConfirmRemoveDevice = async (device: DeviceListItem) => {
    const confirmed = await confirm({
      title: "Remove device?",
      message:
        "This will unlink the device from your account. You can connect it again later using its Device ID.",
      icon: "trash-outline",
      iconColor: "#ef4444",
      confirmText: "Remove",
      cancelText: "Cancel",
      confirmVariant: "danger",
      cancelVariant: "secondary",
    });

    if (!confirmed) {
      return;
    }

    await handleRemoveDevice(device);
  };

  const handleRemoveDevice = async (device: DeviceListItem) => {
    if (!token) {
      showDialog({
        title: "Not authenticated",
        message: "You need to be logged in to remove a device.",
        icon: "alert-circle-outline",
        iconColor: "#ef4444",
      });
      return;
    }

    try {
      const response = await removeDevice(Number(device.id), token);

      if (!response.success) {
        showDialog({
          title: "Failed to remove device",
          message: response.error || "Unable to remove this device. Please try again.",
          icon: "alert-circle-outline",
          iconColor: "#ef4444",
        });
        return;
      }

      setDevices((prev) => prev.filter((d) => d.id !== device.id));

      showDialog({
        title: "Device removed",
        message: "The device has been removed from your account.",
        icon: "checkmark-circle-outline",
        iconColor: "#059669",
      });
    } catch (error: any) {
      showDialog({
        title: "Network error",
        message:
          error?.message || "Unable to remove this device right now. Please check your connection.",
        icon: "alert-circle-outline",
        iconColor: "#ef4444",
      });
    }
  };

  const handleConnectDevice = async () => {
    const name = deviceNameInput.trim();
    const deviceCode = deviceCodeInput.trim();
    const devicePin = devicePinInput.trim();

    if (!name) {
      showDialog({
        title: "Device name required",
        message: "Please enter a name for your device.",
        icon: "alert-circle-outline",
        iconColor: "#ef4444",
      });
      return;
    }

    if (!deviceCode) {
      showDialog({
        title: "Device ID required",
        message: "Please enter the device ID printed on your hardware.",
        icon: "alert-circle-outline",
        iconColor: "#ef4444",
      });
      return;
    }

    if (!devicePin) {
      showDialog({
        title: "Device PIN required",
        message: "Please enter the 6-digit PIN for this device.",
        icon: "alert-circle-outline",
        iconColor: "#ef4444",
      });
      return;
    }

    if (!/^\d{6}$/.test(devicePin)) {
      showDialog({
        title: "Invalid Device PIN",
        message: "Please enter a 6-digit PIN.",
        icon: "alert-circle-outline",
        iconColor: "#ef4444",
      });
      return;
    }

    if (!token) {
      showDialog({
        title: "Not authenticated",
        message: "You need to be logged in to connect a device.",
        icon: "alert-circle-outline",
        iconColor: "#ef4444",
      });
      return;
    }

    setIsConnecting(true);

    try {
      const response = await claimDevice(
        {
          device_id: deviceCode,
          name,
          device_pin: devicePin,
        },
        token,
      );

      if (!response.success || !response.data?.device) {
        const code = response.code;
        let message = response.error || "Failed to connect device.";

        if (code === "not_found") {
          message = "We couldn't find a device with that ID. Please check the label and try again.";
        } else if (code === "owned_by_other") {
          message = "This device has already been claimed by another account.";
        } else if (code === "already_owned") {
          message = "This device is already added to your account.";
        } else if (code === "pin_mismatch") {
          message = "The PIN you entered does not match this device.";
        }

        showDialog({
          title: "Device connection failed",
          message,
          icon: "alert-circle-outline",
          iconColor: "#ef4444",
        });
        return;
      }

      const device = response.data.device;

      setDevices((prev) => {
        const mapped = mapSmartDeviceToListItem(device);
        const existingIndex = prev.findIndex((item) => item.id === mapped.id);

        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = mapped;
          return updated;
        }

        return [...prev, mapped];
      });

      showDialog({
        title: "Device connected",
        message: "Your device has been connected successfully.",
        icon: "checkmark-circle-outline",
        iconColor: "#059669",
      });

      setIsAddingDevice(false);
      setDeviceNameInput("");
      setDeviceCodeInput("");
    } catch (error: any) {
      showDialog({
        title: "Network error",
        message:
          error?.message || "Unable to connect device. Please check your connection and try again.",
        icon: "alert-circle-outline",
        iconColor: "#ef4444",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveEditDevice = async () => {
    if (!editingDevice) {
      return;
    }

    const name = editName.trim();

    if (!name) {
      showDialog({
        title: "Device name required",
        message: "Please enter a name for your device.",
        icon: "alert-circle-outline",
        iconColor: "#ef4444",
      });
      return;
    }

    if (!token) {
      showDialog({
        title: "Not authenticated",
        message: "You need to be logged in to edit a device.",
        icon: "alert-circle-outline",
        iconColor: "#ef4444",
      });
      return;
    }

    setIsSavingEdit(true);

    try {
      const response = await updateDevice(
        Number(editingDevice.id),
        {
          name,
          location: editLocation.trim() || null,
        },
        token,
      );

      if (!response.success || !response.data?.device) {
        showDialog({
          title: "Failed to update device",
          message: response.error || "Unable to save your changes. Please try again.",
          icon: "alert-circle-outline",
          iconColor: "#ef4444",
        });
        return;
      }

      const updated = mapSmartDeviceToListItem(response.data.device);

      setDevices((prev) => {
        const index = prev.findIndex((d) => d.id === updated.id);
        if (index === -1) {
          return prev;
        }
        const clone = [...prev];
        clone[index] = updated;
        return clone;
      });

      showDialog({
        title: "Device updated",
        message: "Your device details have been saved.",
        icon: "checkmark-circle-outline",
        iconColor: "#059669",
      });

      handleCancelEditDevice();
    } catch (error: any) {
      showDialog({
        title: "Network error",
        message: error?.message || "Unable to update this device right now. Please try again.",
        icon: "alert-circle-outline",
        iconColor: "#ef4444",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (editingDevice) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}
        edges={["bottom"]}
      >
        <DevicesEditForm
          theme={theme}
          editingDevice={editingDevice}
          editName={editName}
          editLocation={editLocation}
          isSaving={isSavingEdit}
          onChangeName={setEditName}
          onChangeLocation={setEditLocation}
          onSave={handleSaveEditDevice}
          onCancel={handleCancelEditDevice}
        />
        <DialogComponent />
      </SafeAreaView>
    );
  }

  if (isAddingDevice) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}
        edges={["bottom"]}
      >
        <DevicesAddForm
          theme={theme}
          colorScheme={colorScheme}
          deviceNameInput={deviceNameInput}
          deviceCodeInput={deviceCodeInput}
          devicePinInput={devicePinInput}
          isConnecting={isConnecting}
          onChangeDeviceName={setDeviceNameInput}
          onChangeDeviceCode={setDeviceCodeInput}
          onChangeDevicePin={setDevicePinInput}
          onConnect={handleConnectDevice}
          onCancel={handleCancelAddDevice}
        />
        <DialogComponent />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}
      edges={["bottom"]}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          {/* Add Device Button */}
          <DevicesHeader
            theme={theme}
            colorScheme={colorScheme}
            connectedCount={connectedCount}
            totalDevices={totalDevices}
            offlineCount={offlineCount}
            onAddDevice={handleStartAddDevice}
          />

          {/* Devices List */}
          <DevicesList
            theme={theme}
            colorScheme={colorScheme}
            devices={devices}
            devicesLoading={devicesLoading}
            onShowDetails={handleShowDeviceDetails}
            onEdit={handleStartEditDevice}
            onRemove={handleConfirmRemoveDevice}
            onShare={(device) => setSharingDevice(device)}
          />

          {/* Share Modal */}
          {sharingDevice && token && (
            <DeviceShareModal
              visible={!!sharingDevice}
              deviceId={Number(sharingDevice.id)}
              token={token}
              theme={theme}
              colorScheme={colorScheme}
              onClose={() => setSharingDevice(null)}
              onShareSuccess={async () => {
                // Reload devices to refresh shared status
                if (token) {
                  try {
                    const response = await getDevicesForUser(token);
                    if (response.success && response.data?.devices) {
                      const mapped = response.data.devices.map(mapSmartDeviceToListItem);
                      setDevices(mapped);
                    }
                  } catch (error) {
                    console.error("Failed to reload devices:", error);
                  }
                }
              }}
            />
          )}

          <DialogComponent />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
