import type { SmartDevice } from "../../services/deviceService";

export type DeviceListItem = {
  id: string;
  name: string;
  type: string;
  status: "connected" | "disconnected";
  lastSeen: string;
  deviceId: string;
  location: string | null;
  is_shared?: boolean;
  is_owner?: boolean;
};

export const mapSmartDeviceToListItem = (device: SmartDevice): DeviceListItem => {
  // Ensure device has required fields
  if (!device || !device.id) {
    console.error('Invalid device object:', device);
    throw new Error('Invalid device object');
  }

  const isActive = device.status === "active";
  const fallbackName = device.device_id ?? String(device.id);
  const name = device.name || fallbackName;
  const baseDate = device.date_installed || device.date_added || device.created_at;

  let lastSeen = "Never connected";

  if (baseDate) {
    try {
      lastSeen = new Date(baseDate).toLocaleString();
    } catch {
      lastSeen = String(baseDate);
    }
  }

  return {
    id: String(device.id),
    name,
    type: "Monitoring Device",
    status: isActive ? "connected" : "disconnected",
    lastSeen,
    deviceId: device.device_id || String(device.id),
    location: device.location || null,
    is_shared: device.is_shared ?? false,
    is_owner: device.is_owner ?? true,
  };
};
