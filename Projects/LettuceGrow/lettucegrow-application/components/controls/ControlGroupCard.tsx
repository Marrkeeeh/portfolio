import {
  CONTROL_GROUPS,
  getGroupMode,
  type ControlGroupKey,
  type ControlKey,
  type ControlsState,
} from "@/services/deviceControlsService";
import React from "react";
import { Text, View } from "react-native";
import { ControlGroupHeader } from "./ControlGroupHeader";
import { ControlRow } from "./ControlRow";

type ControlGroupCardProps = {
  theme: any;
  groupKey: ControlGroupKey;
  controls: ControlsState;
  savingKey: ControlKey | null;
  onToggleGroupMode: (groupKey: ControlGroupKey, isManual: boolean) => void;
  onToggleOnOff: (key: ControlKey) => void;
};

export function ControlGroupCard({
  theme,
  groupKey,
  controls,
  savingKey,
  onToggleGroupMode,
  onToggleOnOff,
}: ControlGroupCardProps) {
  const group = CONTROL_GROUPS[groupKey];
  const groupMode = getGroupMode(controls, groupKey);
  const isManual = groupMode === "manual";
  const isSaving = group.keys.some((key) => savingKey === key);

  // Subtitles for each group
  const subtitles: Record<ControlGroupKey, string> = {
    ph_control: "Control acid/base dosing to adjust reservoir pH. When in manual mode, you can control pH Down and pH Up pumps individually.",
    ec_control: "Control nutrient dosing and water management. When in manual mode, you can control Nutrient A, Nutrient B, Flushing, and Reserve Pump individually.",
    algae_control: "Control hydrogen peroxide dosing for algae treatment. When in manual mode, you can control the H2O2 pump directly.",
    mixer: "Control the water mixer independently. When in manual mode, you can turn the mixer on/off directly.",
  };

  return (
    <View
      style={{
        backgroundColor: theme.background,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
      }}
    >
      <ControlGroupHeader
        theme={theme}
        title={group.label}
        subtitle={subtitles[groupKey]}
        isManual={isManual}
        saving={isSaving}
        onToggleMode={(manual) => onToggleGroupMode(groupKey, manual)}
      />
      
      {/* Show individual controls only when in manual mode */}
      {isManual && (
        <View style={{ marginTop: 8 }}>
          {group.keys.map((key) => (
            <ControlRow
              key={key}
              theme={theme}
              controlKey={key}
              state={controls[key]}
              saving={savingKey === key}
              onToggleMode={() => {}} // Individual mode toggle disabled when group is manual
              onToggleOnOff={onToggleOnOff}
              showModeToggle={false} // Hide mode toggle for individual controls
            />
          ))}
        </View>
      )}
      
      {!isManual && (
        <View
          style={{
            backgroundColor: theme.backgroundSecondary,
            padding: 12,
            borderRadius: 8,
            marginTop: 8,
          }}
        >
          <Text style={{ fontSize: 13, color: theme.textSecondary, fontStyle: "italic" }}>
            Auto mode: System will automatically control these pumps based on sensor readings.
          </Text>
        </View>
      )}
    </View>
  );
}
