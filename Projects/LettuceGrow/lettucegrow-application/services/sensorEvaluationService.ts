import { apiGet, apiPut, type ApiResponse } from "./apiService";

export interface SensorEvaluation {
  id: number;
  smart_device_id: number;
  min_temp: number | null;
  max_temp: number | null;
  min_ec: number | null;
  max_ec: number | null;
  min_ph: number | null;
  max_ph: number | null;
  min_dissolved_o2: number | null;
  max_dissolved_o2: number | null;
  // pH Timing Constants (in milliseconds)
  ph_dose_time: number | null;
  ph_retry_time: number | null;
  ph_check_interval: number | null;
  // EC Timing Constants (in milliseconds)
  ec_nutrient_a_time: number | null;
  ec_stir_after_a_time: number | null;
  ec_nutrient_b_time: number | null;
  ec_clean_water_time: number | null;
  ec_retry_time: number | null;
  ec_check_interval: number | null;
  // Algae Timing Constants (in milliseconds)
  algae_h2o2_dose_time: number | null;
  algae_mixing_time: number | null;
  algae_clean_water_time: number | null;
  created_at: string;
  updated_at: string;
}

export interface SensorEvaluationResponse {
  sensor_evaluation: SensorEvaluation;
}

export const getSensorEvaluation = async (
  deviceId: number,
  token: string,
): Promise<ApiResponse<SensorEvaluationResponse>> => {
  return apiGet<SensorEvaluationResponse>(`/devices/${deviceId}/sensor-evaluation`, token);
};

export type SensorEvaluationUpdatePayload = Partial<
  Pick<
    SensorEvaluation,
    | "min_temp"
    | "max_temp"
    | "min_ec"
    | "max_ec"
    | "min_ph"
    | "max_ph"
    | "min_dissolved_o2"
    | "max_dissolved_o2"
    | "ph_dose_time"
    | "ph_retry_time"
    | "ph_check_interval"
    | "ec_nutrient_a_time"
    | "ec_stir_after_a_time"
    | "ec_nutrient_b_time"
    | "ec_clean_water_time"
    | "ec_retry_time"
    | "ec_check_interval"
    | "algae_h2o2_dose_time"
    | "algae_mixing_time"
    | "algae_clean_water_time"
  >
>;

export const updateSensorEvaluation = async (
  deviceId: number,
  payload: SensorEvaluationUpdatePayload,
  token: string,
): Promise<ApiResponse<SensorEvaluationResponse>> => {
  return apiPut<SensorEvaluationResponse>(`/devices/${deviceId}/sensor-evaluation`, payload, token);
};
