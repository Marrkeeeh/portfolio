import { apiGet, apiPut, type ApiResponse } from "./apiService";

export type SupplyType =
  | "nutrient_a"
  | "nutrient_b"
  | "ph_up"
  | "ph_down"
  | "hydrogen_peroxide"
  | "water_tank";

export type SupplyStatus = "in_stock" | "need_refilled";

export interface Supply {
  id: number;
  smart_device_id: number;
  type: SupplyType;
  display_name: string;
  status: SupplyStatus;
  created_at: string;
  updated_at: string;
}

export interface SuppliesIndexData {
  supplies: Supply[];
}

export type SuppliesIndexResponse = ApiResponse<SuppliesIndexData>;

export interface SupplyDetailsData {
  supply: Supply;
}

export type SupplyDetailsResponse = ApiResponse<SupplyDetailsData>;

export const getSuppliesForUser = async (
  token: string,
): Promise<SuppliesIndexResponse> => {
  return apiGet<SuppliesIndexData>("/supplies", token);
};

export const updateSupplyStatus = async (
  id: number,
  status: SupplyStatus,
  token: string,
): Promise<SupplyDetailsResponse> => {
  return apiPut<SupplyDetailsData>(`/supplies/${id}`, { status }, token);
};

export interface SupplyHistoryEntry {
  id: number;
  supply_id: number;
  smart_device_id: number;
  from_status: SupplyStatus | null;
  to_status: SupplyStatus;
  created_at: string;
  updated_at: string;
  supply?: Supply;
}

export interface SuppliesHistoryData {
  history: SupplyHistoryEntry[];
}

export type SuppliesHistoryResponse = ApiResponse<SuppliesHistoryData>;

export const getSupplyHistory = async (
  token: string,
): Promise<SuppliesHistoryResponse> => {
  return apiGet<SuppliesHistoryData>("/supplies/history", token);
};
