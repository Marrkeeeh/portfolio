import type { SmartDevice } from "./deviceService";

export type ControlKey =
  | "ph_down"
  | "ph_up"
  | "nutrient_a"
  | "nutrient_b"
  | "hydrogen_peroxide"
  | "mixer"
  | "flushing"
  | "reserve_pump";

export type ControlGroupKey = "ph_control" | "ec_control" | "algae_control" | "mixer";

export type ControlMode = "auto" | "manual";

export interface ControlState {
  mode: ControlMode;
  isOn: boolean;
}

export type ControlsState = Record<ControlKey, ControlState>;

// Control groups mapping
export const CONTROL_GROUPS: Record<ControlGroupKey, { label: string; keys: ControlKey[] }> = {
  ph_control: {
    label: "pH Control",
    keys: ["ph_down", "ph_up"],
  },
  ec_control: {
    label: "EC Control",
    keys: ["nutrient_a", "nutrient_b", "flushing", "reserve_pump"],
  },
  algae_control: {
    label: "Algae Control",
    keys: ["hydrogen_peroxide"],
  },
  mixer: {
    label: "Mixer",
    keys: ["mixer"],
  },
};

// Helper to get group mode from individual controls
export const getGroupMode = (controls: ControlsState, groupKey: ControlGroupKey): ControlMode => {
  const group = CONTROL_GROUPS[groupKey];
  // If any control in the group is manual, the group is manual
  const hasManual = group.keys.some((key) => controls[key]?.mode === "manual");
  return hasManual ? "manual" : "auto";
};

// Helper to set group mode (sets all controls in group to same mode)
export const setGroupMode = (
  controls: ControlsState,
  groupKey: ControlGroupKey,
  mode: ControlMode,
): ControlsState => {
  const group = CONTROL_GROUPS[groupKey];
  const next = { ...controls };
  
  group.keys.forEach((key) => {
    next[key] = {
      ...next[key],
      mode,
      // When switching to auto, turn off individual controls
      isOn: mode === "auto" ? false : next[key].isOn,
    };
  });
  
  return next;
};

export const DEFAULT_CONTROLS: ControlsState = {
  ph_down: { mode: "auto", isOn: false },
  ph_up: { mode: "auto", isOn: false },
  nutrient_a: { mode: "auto", isOn: false },
  nutrient_b: { mode: "auto", isOn: false },
  hydrogen_peroxide: { mode: "auto", isOn: false },
  mixer: { mode: "auto", isOn: false },
  flushing: { mode: "auto", isOn: false },
  reserve_pump: { mode: "auto", isOn: false },
};

export const CONTROL_LABELS: Record<ControlKey, string> = {
  ph_down: "pH Down",
  ph_up: "pH Up",
  nutrient_a: "Nutrient A",
  nutrient_b: "Nutrient B",
  hydrogen_peroxide: "Hydrogen Peroxide",
  mixer: "Mixer",
  flushing: "Flushing",
  reserve_pump: "Reserve Water Pump",
};

export const parseControlsFromSettings = (
  settings: SmartDevice["settings"] | null | undefined,
): ControlsState => {
  const base: ControlsState = { ...DEFAULT_CONTROLS };
  const source = (settings as any)?.controls || {};

  (Object.keys(base) as ControlKey[]).forEach((key) => {
    const raw = source[key];
    if (!raw) {
      return;
    }
    const mode: ControlMode = raw.mode === "manual" ? "manual" : "auto";
    const isOn = !!raw.isOn;
    base[key] = { mode, isOn };
  });

  return base;
};

export const mergeControlsIntoSettings = (
  settings: SmartDevice["settings"] | null | undefined,
  controls: ControlsState,
): any => {
  const baseSettings = settings && typeof settings === "object" ? settings : {};
  const existingControls = (baseSettings as any).controls || {};

  // Convert ControlsState to the format expected by backend
  const controlsObject: Record<string, { mode: string; isOn: boolean }> = {};
  (Object.keys(controls) as ControlKey[]).forEach((key) => {
    controlsObject[key] = {
      mode: controls[key].mode,
      isOn: controls[key].isOn,
    };
  });

  return {
    ...baseSettings,
    controls: {
      ...existingControls,
      ...controlsObject,
    },
  };
};
