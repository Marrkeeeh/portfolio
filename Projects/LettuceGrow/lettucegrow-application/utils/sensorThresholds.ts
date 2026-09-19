import type { SensorEvaluation } from "@/services/sensorEvaluationService";

export type SensorMetric = {
  value: number;
  optimal: string;
  optimalMin: number;
  optimalMax: number;
  status: "optimal" | "below" | "above";
};

export type DashboardSensorData = {
  pH: SensorMetric;
  EC: SensorMetric;
  temperature: SensorMetric;
  dissolvedO2: SensorMetric;
};

const DEFAULT_THRESHOLDS = {
  pH: { min: 5.5, max: 6.5 },
  EC: { min: 1.4, max: 2.2 },
  temperature: { min: 18, max: 24 },
  dissolvedO2: { min: 5, max: 8 },
};

function resolveRange(
  customMin: number | null | undefined,
  customMax: number | null | undefined,
  fallback: { min: number; max: number },
) {
  return {
    min: customMin ?? fallback.min,
    max: customMax ?? fallback.max,
  };
}

export function getSensorStatus(
  value: number,
  min: number,
  max: number,
): SensorMetric["status"] {
  if (value >= min && value <= max) {
    return "optimal";
  }
  if (value < min) {
    return "below";
  }
  return "above";
}

function formatOptimalLabel(
  key: keyof typeof DEFAULT_THRESHOLDS,
  min: number,
  max: number,
): string {
  switch (key) {
    case "temperature":
      return `${min}-${max}°C`;
    case "dissolvedO2":
      return `${min}-${max} mg/L`;
    default:
      return `${min}-${max}`;
  }
}

function buildMetric(
  key: keyof typeof DEFAULT_THRESHOLDS,
  value: number,
  evaluation: SensorEvaluation | null | undefined,
): SensorMetric {
  const fallback = DEFAULT_THRESHOLDS[key];
  const evaluationKey = {
    pH: { min: "min_ph" as const, max: "max_ph" as const },
    EC: { min: "min_ec" as const, max: "max_ec" as const },
    temperature: { min: "min_temp" as const, max: "max_temp" as const },
    dissolvedO2: { min: "min_dissolved_o2" as const, max: "max_dissolved_o2" as const },
  }[key];

  const { min, max } = resolveRange(
    evaluation?.[evaluationKey.min],
    evaluation?.[evaluationKey.max],
    fallback,
  );

  return {
    value,
    optimalMin: min,
    optimalMax: max,
    optimal: formatOptimalLabel(key, min, max),
    status: getSensorStatus(value, min, max),
  };
}

export function buildDashboardSensorData(
  values: {
    pH: number;
    EC: number;
    temperature: number;
    dissolvedO2: number;
  },
  evaluation: SensorEvaluation | null | undefined,
): DashboardSensorData {
  return {
    pH: buildMetric("pH", values.pH, evaluation),
    EC: buildMetric("EC", values.EC, evaluation),
    temperature: buildMetric("temperature", values.temperature, evaluation),
    dissolvedO2: buildMetric("dissolvedO2", values.dissolvedO2, evaluation),
  };
}

export function mergeSensorValues(
  current: DashboardSensorData,
  values: Partial<{
    pH: number;
    EC: number;
    temperature: number;
    dissolvedO2: number;
  }>,
): DashboardSensorData {
  const nextValues = {
    pH: values.pH ?? current.pH.value,
    EC: values.EC ?? current.EC.value,
    temperature: values.temperature ?? current.temperature.value,
    dissolvedO2: values.dissolvedO2 ?? current.dissolvedO2.value,
  };

  return {
    pH: {
      ...current.pH,
      value: nextValues.pH,
      status: getSensorStatus(nextValues.pH, current.pH.optimalMin, current.pH.optimalMax),
    },
    EC: {
      ...current.EC,
      value: nextValues.EC,
      status: getSensorStatus(nextValues.EC, current.EC.optimalMin, current.EC.optimalMax),
    },
    temperature: {
      ...current.temperature,
      value: nextValues.temperature,
      status: getSensorStatus(
        nextValues.temperature,
        current.temperature.optimalMin,
        current.temperature.optimalMax,
      ),
    },
    dissolvedO2: {
      ...current.dissolvedO2,
      value: nextValues.dissolvedO2,
      status: getSensorStatus(
        nextValues.dissolvedO2,
        current.dissolvedO2.optimalMin,
        current.dissolvedO2.optimalMax,
      ),
    },
  };
}

export const DEFAULT_SENSOR_VALUES = {
  pH: 5.4,
  EC: 1.0,
  temperature: 22.1,
  dissolvedO2: 6.8,
};

export const INITIAL_DASHBOARD_SENSOR_DATA = buildDashboardSensorData(
  DEFAULT_SENSOR_VALUES,
  null,
);
