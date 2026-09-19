import type { DeviceSelectorOption } from "@/components/devices/DeviceSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useDeviceSelection } from "@/contexts/DeviceSelectionContext";
import { getDevicesForUser, type SmartDevice } from "@/services/deviceService";
import { useFocusEffect } from "expo-router";
import { useCallback, useState, type Dispatch, type SetStateAction } from "react";

export interface UseDeviceSelectorResult {
  devices: SmartDevice[];
  selectorDevices: DeviceSelectorOption[];
  selectedDeviceId: number | null;
  loadingDevices: boolean;
  setSelectedDeviceId: Dispatch<SetStateAction<number | null>>;
  reloadDevices: () => Promise<void>;
}

export const useDeviceSelector = (): UseDeviceSelectorResult => {
  const { token } = useAuth();
  const { selectedDeviceId, setSelectedDeviceId } = useDeviceSelection();
  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [selectorDevices, setSelectorDevices] = useState<DeviceSelectorOption[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const loadDevices = useCallback(async () => {
    if (!token) {
      setDevices([]);
      setSelectorDevices([]);
      setSelectedDeviceId(null);
      return;
    }

    setLoadingDevices(true);
    try {
      const response = await getDevicesForUser(token);

      if (!response.success || !response.data?.devices) {
        setDevices([]);
        setSelectorDevices([]);
        setSelectedDeviceId(null);
        return;
      }

      const list = response.data.devices;
      setDevices(list);

      const options: DeviceSelectorOption[] = list.map((device) => ({
        id: device.id,
        name: device.name || device.device_id || `Device ${device.id}`,
        deviceId: device.device_id,
      }));
      setSelectorDevices(options);

      setSelectedDeviceId((prev) => {
        if (prev && list.some((d) => d.id === prev)) {
          return prev;
        }
        return list.length > 0 ? list[0].id : null;
      });
    } finally {
      setLoadingDevices(false);
    }
  }, [token, setSelectedDeviceId]);

  useFocusEffect(
    useCallback(() => {
      void loadDevices();
    }, [loadDevices]),
  );

  return {
    devices,
    selectorDevices,
    selectedDeviceId,
    loadingDevices,
    setSelectedDeviceId,
    reloadDevices: loadDevices,
  };
};
