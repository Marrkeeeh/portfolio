import React, {
    createContext,
    useContext,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from "react";

type DeviceSelectionContextType = {
  selectedDeviceId: number | null;
  setSelectedDeviceId: Dispatch<SetStateAction<number | null>>;
};

const DeviceSelectionContext =
  createContext<DeviceSelectionContextType | undefined>(undefined);

export const DeviceSelectionProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);

  return (
    <DeviceSelectionContext.Provider value={{ selectedDeviceId, setSelectedDeviceId }}>
      {children}
    </DeviceSelectionContext.Provider>
  );
};

export const useDeviceSelection = (): DeviceSelectionContextType => {
  const context = useContext(DeviceSelectionContext);
  if (!context) {
    throw new Error("useDeviceSelection must be used within a DeviceSelectionProvider");
  }
  return context;
};
