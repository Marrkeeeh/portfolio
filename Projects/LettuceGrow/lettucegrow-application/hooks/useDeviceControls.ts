import { type DeviceSelectorOption } from "@/components/devices/DeviceSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useDeviceSelection } from "@/contexts/DeviceSelectionContext";
import {
  CONTROL_GROUPS,
  DEFAULT_CONTROLS,
  mergeControlsIntoSettings,
  parseControlsFromSettings,
  setGroupMode,
  type ControlGroupKey,
  type ControlKey,
  type ControlsState,
} from "@/services/deviceControlsService";
import { getDevicesForUser, updateDevice, type SmartDevice } from "@/services/deviceService";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";

export interface UseDeviceControlsResult {
  devices: SmartDevice[];
  selectorDevices: DeviceSelectorOption[];
  selectedDeviceId: number | null;
  controls: ControlsState;
  loadingDevices: boolean;
  savingKey: ControlKey | null;
  setSelectedDeviceId: Dispatch<SetStateAction<number | null>>;
  toggleMode: (key: ControlKey, isManual: boolean) => void;
  toggleGroupMode: (groupKey: ControlGroupKey, isManual: boolean) => void;
  toggleOnOff: (key: ControlKey) => void;
  wifiResetting: boolean;
  requestWifiReset: () => Promise<void>;
}

export const useDeviceControls = (): UseDeviceControlsResult => {
  const { token } = useAuth();
  const { selectedDeviceId, setSelectedDeviceId } = useDeviceSelection();

  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [selectorDevices, setSelectorDevices] = useState<DeviceSelectorOption[]>([]);
  const [controls, setControls] = useState<ControlsState>(DEFAULT_CONTROLS);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [savingKey, setSavingKey] = useState<ControlKey | null>(null);
  const [wifiResetting, setWifiResetting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        setDevices([]);
        setSelectorDevices([]);
        setSelectedDeviceId(null);
        setControls(DEFAULT_CONTROLS);
        return;
      }

      let cancelled = false;

      const loadDevices = async () => {
        setLoadingDevices(true);
        try {
          const response = await getDevicesForUser(token);

          if (!response.success || !response.data?.devices || cancelled) {
            if (!cancelled) {
              setDevices([]);
              setSelectorDevices([]);
              setSelectedDeviceId(null);
              setControls(DEFAULT_CONTROLS);
            }
            return;
          }

          const list = response.data.devices;
          setDevices(list);

          const selectorOptions: DeviceSelectorOption[] = list.map((device) => ({
            id: device.id,
            name: device.name || device.device_id || `Device ${device.id}`,
            deviceId: device.device_id,
          }));
          setSelectorDevices(selectorOptions);

          setSelectedDeviceId((prev) => {
            if (prev && list.some((d) => d.id === prev)) {
              return prev;
            }
            return list.length > 0 ? list[0].id : null;
          });
        } finally {
          if (!cancelled) {
            setLoadingDevices(false);
          }
        }
      };

      void loadDevices();

      return () => {
        cancelled = true;
      };
    }, [token, setSelectedDeviceId]),
  );

  useEffect(() => {
    if (!selectedDeviceId) {
      setControls(DEFAULT_CONTROLS);
      return;
    }

    const device = devices.find((d) => d.id === selectedDeviceId);
    if (!device) {
      setControls(DEFAULT_CONTROLS);
      return;
    }

    setControls(parseControlsFromSettings(device.settings));
  }, [selectedDeviceId, devices]);

  const persistControls = useCallback(
    async (deviceId: number, nextControls: ControlsState, key: ControlKey) => {
      if (!token) {
        return;
      }

      const device = devices.find((d) => d.id === deviceId);
      const currentSettings = device?.settings || null;
      const newSettings = mergeControlsIntoSettings(currentSettings, nextControls);

      setSavingKey(key);

      try {
        const response = await updateDevice(deviceId, { settings: newSettings }, token);

        if (response.success && response.data?.device) {
          const updatedDevice = response.data.device;
          setDevices((prev) => prev.map((d) => (d.id === updatedDevice.id ? updatedDevice : d)));
        }
      } finally {
        setSavingKey((current) => (current === key ? null : current));
      }
    },
    [devices, token],
  );

  const toggleMode = useCallback(
    (controlKey: ControlKey, isManual: boolean) => {
      if (!selectedDeviceId) {
        return;
      }

      setControls((prev) => {
        const next: ControlsState = {
          ...prev,
          [controlKey]: {
            ...prev[controlKey],
            mode: isManual ? "manual" : "auto",
            // When switching to auto, turn off
            isOn: isManual ? prev[controlKey].isOn : false,
          },
        };
        void persistControls(selectedDeviceId, next, controlKey);
        return next;
      });
    },
    [persistControls, selectedDeviceId],
  );

  const toggleGroupMode = useCallback(
    (groupKey: ControlGroupKey, isManual: boolean) => {
      if (!selectedDeviceId) {
        return;
      }

      setControls((prev) => {
        const next = setGroupMode(prev, groupKey, isManual ? "manual" : "auto");
        // Use the first key in the group for saving indicator
        const firstKey = CONTROL_GROUPS[groupKey].keys[0];
        void persistControls(selectedDeviceId, next, firstKey);
        return next;
      });
    },
    [persistControls, selectedDeviceId],
  );

  const requestWifiReset = useCallback(async () => {
    if (!token || !selectedDeviceId) {
      return;
    }

    const device = devices.find((d) => d.id === selectedDeviceId);
    const currentWifiData = (device as any)?.wifi_data || {};
    const nextWifiData = { ...currentWifiData, reset_requested: true };

    setWifiResetting(true);
    try {
      const response = await updateDevice(
        selectedDeviceId,
        { wifi_data: nextWifiData },
        token,
      );

      if (response.success && response.data?.device) {
        const updatedDevice = response.data.device;
        setDevices((prev) =>
          prev.map((d) => (d.id === updatedDevice.id ? updatedDevice : d)),
        );
      }
    } finally {
      setWifiResetting(false);
    }
  }, [devices, selectedDeviceId, token]);

  const toggleOnOff = useCallback(
    (controlKey: ControlKey) => {
      if (!selectedDeviceId) {
        return;
      }

      setControls((prev) => {
        const prevState = prev[controlKey];
        const next: ControlsState = {
          ...prev,
          [controlKey]: {
            ...prevState,
            isOn: !prevState.isOn,
          },
        };
        void persistControls(selectedDeviceId, next, controlKey);
        return next;
      });
    },
    [persistControls, selectedDeviceId],
  );

  return {
    devices,
    selectorDevices,
    selectedDeviceId,
    controls,
    loadingDevices,
    savingKey,
    setSelectedDeviceId,
    toggleMode,
    toggleGroupMode,
    toggleOnOff,
    wifiResetting,
    requestWifiReset,
  };
};
