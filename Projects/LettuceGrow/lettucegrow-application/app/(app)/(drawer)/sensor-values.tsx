import DeviceSelector from "@/components/devices/DeviceSelector";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useAuth } from "@/contexts/AuthContext";
import "@/global.css";
import { useDeviceSelector } from "@/hooks/useDeviceSelector";
import { getSensorEvaluation, updateSensorEvaluation, type SensorEvaluationUpdatePayload } from "@/services/sensorEvaluationService";
import { getPlantsByDevice, getGrowthStagePHRange, getGrowthStageECRange, type Plant } from "@/services/plantService";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Conversion types for different input methods
// 'liters': Water volume input - Time(s) = Liters / 6 × 60 (water pump: 6 L/min)
// 'ml': Direct mL volume input - Time(s) = mL / 80 × 60 (dosing pump: 80 mL/min)
// 'concentration': Concentration rate input (mL/L) - uses water volume to calculate total, then time
// 'none': Direct seconds input
type ConversionType = 'liters' | 'ml' | 'concentration' | 'none';

// Default water volume for concentration calculations (in Liters)
const DEFAULT_WATER_VOLUME = 6;

interface FieldConfig {
  key: keyof SensorEvaluationUpdatePayload;
  label: string;
  unit: string;
  category?: string;
  defaultValue?: number | null;
  conversion?: ConversionType;
}


interface FieldSection {
  title: string;
  description?: string;
  fields: FieldConfig[];
}

// Conversion functions
// Water pump: 1 L/min → Time(s) = Liters × 60
// Dosing pump: 80 mL/min → Time(s) = TotalVolume(mL) / 80 × 60 = TotalVolume × 0.75
// For concentration: TotalVolume = Concentration(mL/L) × WaterVolume(L)
//                    Time(s) = (Concentration × WaterVolume) / 80 × 60

// Convert concentration (mL/L) to pump time (seconds)
const concentrationToTime = (concentration: number, waterVolumeLiters: number): number => {
  const totalVolumeMl = concentration * waterVolumeLiters;
  const timeSeconds = (totalVolumeMl / 80) * 60; // 80 mL/min pump rate
  return timeSeconds;
};

// Convert pump time (seconds) back to concentration (mL/L)
const timeToConcentration = (timeSeconds: number, waterVolumeLiters: number): number => {
  if (waterVolumeLiters <= 0) return 0;
  const totalVolumeMl = (timeSeconds / 60) * 80; // reverse: mL = (time / 60) × 80
  const concentration = totalVolumeMl / waterVolumeLiters;
  return concentration;
};

// Pump flow rates
const WATER_PUMP_FLOW_RATE = 6.0; // L/min
const DOSING_PUMP_FLOW_RATE = 80.0; // mL/min (1.33 mL/s)

// Convert liters to time (for water pump)
// Time(s) = Liters / FlowRate × 60
const litersToTime = (liters: number): number => {
  return (liters / WATER_PUMP_FLOW_RATE) * 60; // 6 L/min pump rate → 6L = 60s
};

// Convert time to liters
// Liters = Time(s) / 60 × FlowRate
const timeToLiters = (timeSeconds: number): number => {
  return (timeSeconds / 60) * WATER_PUMP_FLOW_RATE;
};

// Convert mL volume to time (for dosing pump - pH, direct volume)
// Time(s) = mL / FlowRate × 60
const mlToTime = (ml: number): number => {
  return (ml / DOSING_PUMP_FLOW_RATE) * 60; // 80 mL/min → 2.0mL = 1.5s
};

// Convert time to mL volume
// mL = Time(s) / 60 × FlowRate
const timeToMl = (timeSeconds: number): number => {
  return (timeSeconds / 60) * DOSING_PUMP_FLOW_RATE;
};

const SENSOR_THRESHOLDS: FieldConfig[] = [
  { key: "min_temp", label: "Min Water Temperature", unit: "°C", defaultValue: 20.0 },
  { key: "max_temp", label: "Max Water Temperature", unit: "°C", defaultValue: 24.0 },
  { key: "min_ec", label: "Min EC", unit: "dS/m", defaultValue: 1.5 },
  { key: "max_ec", label: "Max EC", unit: "dS/m", defaultValue: 2.5 },
  { key: "min_ph", label: "Min pH", unit: "", defaultValue: 5.5 },
  { key: "max_ph", label: "Max pH", unit: "", defaultValue: 6.5 },
  { key: "min_dissolved_o2", label: "Min Dissolved O2", unit: "mg/L", defaultValue: 5.0 },
];

const PH_TIMING_FIELDS: FieldConfig[] = [
  // pH dose: direct volume input (mL), NOT concentration
  // Time = Volume / 80 × 60 (pump rate: 80 mL/min = 1.33 mL/s)
  { key: "ph_dose_time", label: "pH Dose Volume", unit: "mL", category: "pH Dosing", defaultValue: 2.0, conversion: 'ml' },
  { key: "ph_retry_time", label: "pH Retry Time", unit: "s", category: "pH Timing", defaultValue: 300 },
  { key: "ph_check_interval", label: "pH Check Interval", unit: "s", category: "pH Timing", defaultValue: 5 },
];

const EC_TIMING_FIELDS: FieldConfig[] = [
  // Water volume first - this is used for concentration calculations
  // Also determines clean water pump time: Time = Liters × 60s
  { key: "ec_clean_water_time", label: "Water Volume", unit: "L", category: "Water", defaultValue: DEFAULT_WATER_VOLUME, conversion: 'liters' },
  // Nutrient A: concentration rate (mL/L)
  // Seedling: 2.5 mL/L, Vegetative: 5.0 mL/L
  { key: "ec_nutrient_a_time", label: "Nutrient A Concentration", unit: "mL/L", category: "EC Dosing", defaultValue: 2.5, conversion: 'concentration' },
  { key: "ec_stir_after_a_time", label: "Stir After A Time", unit: "s", category: "EC Timing", defaultValue: 60 },
  // Nutrient B: concentration rate (mL/L)
  // Seedling: 2.5 mL/L, Vegetative: 5.0 mL/L
  { key: "ec_nutrient_b_time", label: "Nutrient B Concentration", unit: "mL/L", category: "EC Dosing", defaultValue: 2.5, conversion: 'concentration' },
  { key: "ec_retry_time", label: "EC Retry Time", unit: "s", category: "EC Timing", defaultValue: 300 },
  { key: "ec_check_interval", label: "EC Check Interval", unit: "s", category: "EC Timing", defaultValue: 5 },
];

// Growth stage-based nutrient concentration defaults (in mL/L)
const getNutrientConcentrationDefaults = (growthStage: 'seedling' | 'vegetative') => {
  if (growthStage === 'seedling') {
    return { nutrientA: 2.5, nutrientB: 2.5 }; // mL/L
  } else {
    return { nutrientA: 5.0, nutrientB: 5.0 }; // mL/L
  }
};

const ALGAE_TIMING_FIELDS: FieldConfig[] = [
  // Algae water volume - used for H2O2 concentration calculation
  { key: "algae_clean_water_time", label: "Water Volume", unit: "L", category: "Water", defaultValue: DEFAULT_WATER_VOLUME, conversion: 'liters' },
  // H2O2 dose: concentration rate (mL/L) - default 0.46 mL/L for preventive treatment
  { key: "algae_h2o2_dose_time", label: "H2O2 Concentration", unit: "mL/L", category: "Algae Dosing", defaultValue: 0.46, conversion: 'concentration' },
  { key: "algae_mixing_time", label: "Mixing Time", unit: "s", category: "Algae Timing", defaultValue: 120 },
];

const ALL_FIELDS: FieldConfig[] = [
  ...SENSOR_THRESHOLDS,
  ...PH_TIMING_FIELDS,
  ...EC_TIMING_FIELDS,
  ...ALGAE_TIMING_FIELDS,
];

const FIELD_SECTIONS: FieldSection[] = [
  {
    title: "Sensor Thresholds",
    description: "Set custom thresholds for sensor readings",
    fields: SENSOR_THRESHOLDS,
  },
  {
    title: "pH Control",
    description: "Enter pH dose volume (mL). Time = Volume / 80 × 60. Pump: 80 mL/min (1.33 mL/s). Default: 2.0 mL = 1.5s",
    fields: PH_TIMING_FIELDS,
  },
  {
    title: "EC Control",
    description: "Set water volume and nutrient concentrations (mL/L). Seedling: 2.5 mL/L, Vegetative: 5.0 mL/L. Pump: 80 mL/min",
    fields: EC_TIMING_FIELDS,
  },
  {
    title: "Algae Treatment",
    description: "H2O2 concentration (mL/L). Default: 0.46 mL/L for preventive treatment. Pump: 80 mL/min",
    fields: ALGAE_TIMING_FIELDS,
  },
];

export default function SensorValuesScreen() {
  const { theme, colorScheme } = useAppearance();
  const { token } = useAuth();
  const { selectorDevices, selectedDeviceId, setSelectedDeviceId } = useDeviceSelector();

  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePlant, setActivePlant] = useState<Plant | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const parseNumberOrNull = (text: string): number | null => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const num = Number(trimmed);
    return Number.isNaN(num) ? null : num;
  };

  // Load active plant for the selected device
  const loadActivePlant = useCallback(async () => {
    if (!token || !selectedDeviceId) {
      setActivePlant(null);
      return;
    }
    try {
      const plantsResponse = await getPlantsByDevice(selectedDeviceId, token);
      if (plantsResponse.success && plantsResponse.data?.plants) {
        // Find the active (non-retired) plant
        const active = plantsResponse.data.plants.find(
          (p) => p.status !== 'retired'
        );
        setActivePlant(active || null);
      } else {
        setActivePlant(null);
      }
    } catch (e) {
      console.error('Failed to load active plant:', e);
      setActivePlant(null);
    }
  }, [selectedDeviceId, token]);

  const load = useCallback(async () => {
    if (!token || !selectedDeviceId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Load sensor evaluation and active plant in parallel
      await Promise.all([
        (async () => {
          const response = await getSensorEvaluation(selectedDeviceId, token);
          if (!response.success) {
            setError(response.error || "Failed to load sensor values.");
            return;
          }

          const evalData = response.data?.sensor_evaluation ?? null;
          const next: Record<string, string> = {};
          
          // First, get the water volumes (needed for concentration calculations)
          const ecWaterTimeSeconds = evalData?.ec_clean_water_time ?? null;
          const algaeWaterTimeSeconds = evalData?.algae_clean_water_time ?? null;
          const ecWaterVolume = ecWaterTimeSeconds ? timeToLiters(ecWaterTimeSeconds) : DEFAULT_WATER_VOLUME;
          const algaeWaterVolume = algaeWaterTimeSeconds ? timeToLiters(algaeWaterTimeSeconds) : DEFAULT_WATER_VOLUME;
          
          ALL_FIELDS.forEach(({ key, conversion }) => {
            const raw = evalData ? (evalData as any)[key] : null;
            if (raw === null || raw === undefined) {
              next[key] = "";
            } else {
              const convType = conversion || 'none';
              let displayValue: number;
              
              if (convType === 'liters') {
                // Water volume: convert time to liters
                displayValue = timeToLiters(Number(raw));
              } else if (convType === 'ml') {
                // Direct mL volume: convert time to mL
                displayValue = timeToMl(Number(raw));
              } else if (convType === 'concentration') {
                // Concentration: convert time to concentration using water volume
                // Determine which water volume to use based on field
                const waterVolume = key.startsWith('algae_') ? algaeWaterVolume : ecWaterVolume;
                displayValue = timeToConcentration(Number(raw), waterVolume);
              } else {
                displayValue = Number(raw);
              }
              
              // Round to 2 decimal places for cleaner display
              next[key] = String(Math.round(displayValue * 100) / 100);
            }
          });
          setValues(next);
        })(),
        loadActivePlant(),
      ]);
    } catch (e: any) {
      setError(e?.message || "Failed to load sensor values.");
    } finally {
      setLoading(false);
    }
  }, [selectedDeviceId, token, loadActivePlant]);

  useEffect(() => {
    void load();
  }, [load]);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleChange = (key: string, text: string) => {
    setValues((current) => ({ ...current, [key]: text }));
  };

  const handleSave = async () => {
    if (!token || !selectedDeviceId) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: SensorEvaluationUpdatePayload = {};
      
      // First, get the water volumes from current values (needed for concentration calculations)
      const ecWaterVolumeStr = values['ec_clean_water_time'] ?? "";
      const algaeWaterVolumeStr = values['algae_clean_water_time'] ?? "";
      const ecWaterVolume = parseNumberOrNull(ecWaterVolumeStr) ?? DEFAULT_WATER_VOLUME;
      const algaeWaterVolume = parseNumberOrNull(algaeWaterVolumeStr) ?? DEFAULT_WATER_VOLUME;
      
      ALL_FIELDS.forEach(({ key, conversion }) => {
        const text = values[key] ?? "";
        const num = parseNumberOrNull(text);
        if (num === null) {
          (payload as any)[key] = null;
        } else {
          const convType = conversion || 'none';
          let timeValue: number;
          
          if (convType === 'liters') {
            // Water volume: convert liters to time
            timeValue = litersToTime(num);
          } else if (convType === 'ml') {
            // Direct mL volume: convert mL to time
            // Time (s) = mL / 80 × 60
            timeValue = mlToTime(num);
          } else if (convType === 'concentration') {
            // Concentration: convert to time using water volume
            // Total Volume (mL) = Concentration (mL/L) × Water Volume (L)
            // Time (s) = Total Volume / 80 × 60
            const waterVolume = key.startsWith('algae_') ? algaeWaterVolume : ecWaterVolume;
            timeValue = concentrationToTime(num, waterVolume);
          } else {
            timeValue = num;
          }
          
          // Round to avoid floating point issues
          (payload as any)[key] = Math.round(timeValue * 100) / 100;
        }
      });

      const response = await updateSensorEvaluation(selectedDeviceId, payload, token);
      if (!response.success) {
        setError(response.error || "Failed to save sensor values.");
        return;
      }
      // Reload to get the converted values back
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to save sensor values.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!token || !selectedDeviceId) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Create payload with all fields set to null to clear custom values
      const payload: SensorEvaluationUpdatePayload = {};
      ALL_FIELDS.forEach(({ key }) => {
        (payload as any)[key] = null;
      });

      const response = await updateSensorEvaluation(selectedDeviceId, payload, token);
      if (!response.success) {
        setError(response.error || "Failed to reset to defaults.");
        return;
      }
      // Reload to get the cleared values
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to reset to defaults.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundSecondary }} edges={["bottom"]}>
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
          <DeviceSelector
            theme={theme}
            colorScheme={colorScheme}
            devices={selectorDevices}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={(id) => setSelectedDeviceId(id)}
          />

          <Text style={{ fontSize: 24, fontWeight: "700", color: theme.text, marginBottom: 8 }}>
            Sensor Values & Timing
          </Text>
          <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 8 }}>
            Set custom thresholds and timing constants for this device. Leave a field empty to use the recommended defaults.
          </Text>
          {activePlant?.growth_stage && (
            <View style={{ 
              backgroundColor: theme.background, 
              padding: 12, 
              borderRadius: 8, 
              borderWidth: 1, 
              borderColor: theme.border,
              marginBottom: 16 
            }}>
              <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 4 }}>
                Active Plant Growth Stage:
              </Text>
              <Text style={{ fontSize: 15, fontWeight: "600", color: theme.text, marginBottom: 4 }}>
                {activePlant.growth_stage === 'seedling' ? '🌱 Seedling' : '🌿 Vegetative'} ({activePlant.plant_age_days} days old)
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                pH and EC defaults will use {activePlant.growth_stage} stage ranges. Custom values override these defaults.
              </Text>
            </View>
          )}

          {loading && (
            <View style={{ marginVertical: 16, alignItems: "center" }}>
              <ActivityIndicator color={theme.primary} />
            </View>
          )}

          {error && (
            <Text style={{ color: theme.error, marginBottom: 12 }}>
              {error}
            </Text>
          )}

          {FIELD_SECTIONS.map((section, sectionIndex) => (
            <View key={section.title} style={{ marginBottom: sectionIndex < FIELD_SECTIONS.length - 1 ? 24 : 0 }}>
              <Text style={{ fontSize: 18, fontWeight: "600", color: theme.text, marginBottom: 4, marginTop: sectionIndex > 0 ? 8 : 0 }}>
                {section.title}
              </Text>
              {section.description && (
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 12 }}>
                  {section.description}
                </Text>
              )}
              {section.fields.map(({ key, label, unit, defaultValue }) => {
                const value = values[key] ?? "";
                
                // Get growth stage-based default for pH and EC if plant exists
                let dynamicDefault: number | null | undefined = defaultValue;
                let dynamicLabel = "";
                
                if (activePlant?.growth_stage) {
                  if (key === 'min_ph' || key === 'max_ph') {
                    const phRange = getGrowthStagePHRange(activePlant.growth_stage);
                    if (phRange) {
                      if (key === 'min_ph') {
                        dynamicDefault = phRange.min;
                        dynamicLabel = ` (${activePlant.growth_stage}: ${phRange.min}-${phRange.max})`;
                      } else if (key === 'max_ph') {
                        dynamicDefault = phRange.max;
                        dynamicLabel = ` (${activePlant.growth_stage}: ${phRange.min}-${phRange.max})`;
                      }
                    }
                  } else if (key === 'min_ec' || key === 'max_ec') {
                    const ecRange = getGrowthStageECRange(activePlant.growth_stage);
                    if (ecRange) {
                      if (key === 'min_ec') {
                        dynamicDefault = ecRange.min;
                        dynamicLabel = ` (${activePlant.growth_stage}: ${ecRange.min}-${ecRange.max} dS/m)`;
                      } else if (key === 'max_ec') {
                        dynamicDefault = ecRange.max;
                        dynamicLabel = ` (${activePlant.growth_stage}: ${ecRange.min}-${ecRange.max} dS/m)`;
                      }
                    }
                  } else if (key === 'ec_nutrient_a_time' || key === 'ec_nutrient_b_time') {
                    // Nutrient concentrations based on growth stage (mL/L)
                    const nutrientDefaults = getNutrientConcentrationDefaults(activePlant.growth_stage);
                    if (key === 'ec_nutrient_a_time') {
                      dynamicDefault = nutrientDefaults.nutrientA;
                      dynamicLabel = ` (${activePlant.growth_stage}: ${nutrientDefaults.nutrientA} mL/L)`;
                    } else if (key === 'ec_nutrient_b_time') {
                      dynamicDefault = nutrientDefaults.nutrientB;
                      dynamicLabel = ` (${activePlant.growth_stage}: ${nutrientDefaults.nutrientB} mL/L)`;
                    }
                  }
                }
                
                const placeholder = dynamicDefault !== null && dynamicDefault !== undefined
                  ? `Default: ${dynamicDefault}${unit ? ` ${unit}` : ""}${dynamicLabel}`
                  : "Use default";
                return (
                  <View key={key} style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, color: theme.text, marginBottom: 4 }}>
                      {label}{dynamicLabel ? <Text style={{ fontSize: 12, color: theme.textSecondary }}>{dynamicLabel}</Text> : null}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: theme.background,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: theme.border,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                      }}
                    >
                      <TextInput
                        style={{
                          flex: 1,
                          color: theme.text,
                          fontSize: 14,
                        }}
                        keyboardType="numeric"
                        placeholder={placeholder}
                        placeholderTextColor={theme.textTertiary}
                        value={value}
                        onChangeText={(text) => handleChange(key, text)}
                      />
                      {unit ? (
                        <Text style={{ marginLeft: 8, color: theme.textSecondary, fontSize: 12 }}>
                          {unit}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}

          <View style={{ flexDirection: "row", marginTop: 16 }}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{
                flex: 1,
                backgroundColor: theme.primary,
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: "center",
                marginRight: 8,
                opacity: saving ? 0.7 : 1,
              }}
            >
              <Text style={{ color: "#ffffff", fontWeight: "600" }}>
                {saving ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleResetToDefaults}
              disabled={saving}
              style={{
                flex: 1,
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.border,
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: "center",
                marginLeft: 8,
              }}
            >
              <Text style={{ color: theme.text, fontWeight: "600" }}>Use Defaults</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
