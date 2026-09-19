import { CHANNELS, EVENTS, initPusher, subscribeToChannelEvent, unsubscribeFromChannel } from "@/utils/pusher";
import { getDeviceById } from "@/services/deviceService";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { useDeviceSelection } from "./DeviceSelectionContext";

interface SensorTelemetry {
  ph_level?: number | null;
  ec_level?: number | null;
  temperature?: number | null;
  do_data?: number | null;
  supplies?: Record<string, any> | null;
}

export interface ControlStatus {
  type: 'algae' | 'ph' | 'ec' | 'water_refill' | 'idle';
  state: string;
  progress: number;
  elapsed: number;
  total: number;
  description: string;
  updated_at?: string;
}

interface DeviceMonitoringContextValue {
  telemetry: SensorTelemetry | null;
  hasTelemetry: boolean;
  controlStatus: ControlStatus | null;
}

const DeviceMonitoringContext = createContext<DeviceMonitoringContextValue | undefined>(undefined);

export const DeviceMonitoringProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const { selectedDeviceId } = useDeviceSelection();

  const [telemetry, setTelemetry] = useState<SensorTelemetry | null>(null);
  const [hasTelemetry, setHasTelemetry] = useState(false);
  const [controlStatus, setControlStatus] = useState<ControlStatus | null>(null);

  const currentChannelRef = useRef<string | null>(null);

  const cleanupChannel = useCallback(async () => {
    if (currentChannelRef.current) {
      const channelName = currentChannelRef.current;
      currentChannelRef.current = null;
      try {
        await unsubscribeFromChannel(channelName);
      } catch {
        // ignore
      }
    }
  }, []);

  // Load initial control status from device settings
  useEffect(() => {
    if (!token || !selectedDeviceId) {
      setControlStatus(null);
      return;
    }

    let cancelled = false;

    const loadInitialControlStatus = async () => {
      try {
        const response = await getDeviceById(selectedDeviceId, token);
        if (cancelled) return;

        const controlStatusFromDevice = response.data?.device?.settings?.control_status;
        if (controlStatusFromDevice) {
          setControlStatus(controlStatusFromDevice as ControlStatus);
        }
      } catch (error) {
        console.error("Failed to load initial control status", error);
      }
    };

    void loadInitialControlStatus();

    return () => {
      cancelled = true;
    };
  }, [token, selectedDeviceId]);

  useEffect(() => {
    if (!token || !selectedDeviceId) {
      void cleanupChannel();
      setTelemetry(null);
      setHasTelemetry(false);
      setControlStatus(null);
      return;
    }

    const channelName = CHANNELS.DEVICE_MONITORING(selectedDeviceId);

    // If already subscribed to the same channel, do nothing
    if (currentChannelRef.current === channelName) {
      return;
    }

    let cancelled = false;

    const setup = async () => {
      try {
        await cleanupChannel();
        await initPusher(token);

        if (cancelled) return;

        await subscribeToChannelEvent(channelName, EVENTS.SENSOR_DATA_UPDATED, (payload: any) => {
          if (!payload || !payload.changes) return;

          const changes = payload.changes as any;

          setTelemetry((prev) => {
            const next: SensorTelemetry = {
              ph_level: typeof changes.ph_level === "number" ? changes.ph_level : prev?.ph_level ?? null,
              ec_level: typeof changes.ec_level === "number" ? changes.ec_level : prev?.ec_level ?? null,
              temperature:
                typeof changes.temperature === "number" ? changes.temperature : prev?.temperature ?? null,
              do_data: typeof changes.do_data === "number" ? changes.do_data : prev?.do_data ?? null,
              supplies: (changes.supplies as Record<string, any> | undefined) ?? prev?.supplies ?? null,
            };

            return next;
          });

          // Update control status if provided
          // Note: Push notifications are now sent by the backend when control status changes
          if (changes.control_status) {
            setControlStatus(changes.control_status as ControlStatus);
          }

          setHasTelemetry(true);
        });

        currentChannelRef.current = channelName;
      } catch (error) {
        console.error("Failed to setup global device monitoring subscription", error);
      }
    };

    void setup();

    return () => {
      cancelled = true;
    };
  }, [token, selectedDeviceId, cleanupChannel]);

  const value = useMemo<DeviceMonitoringContextValue>(
    () => ({ telemetry, hasTelemetry, controlStatus }),
    [telemetry, hasTelemetry, controlStatus],
  );

  return (
    <DeviceMonitoringContext.Provider value={value}>
      {children}
    </DeviceMonitoringContext.Provider>
  );
};

export const useDeviceMonitoring = (): DeviceMonitoringContextValue => {
  const ctx = useContext(DeviceMonitoringContext);
  if (!ctx) {
    throw new Error("useDeviceMonitoring must be used within a DeviceMonitoringProvider");
  }
  return ctx;
};
