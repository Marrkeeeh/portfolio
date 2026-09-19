/**
 * Plant Service for LettuceGrow
 * Handles plant management API calls
 * 
 * Supports cut-and-come-again harvesting:
 * - Plants can be harvested multiple times
 * - After harvest, plant continues growing for next harvest
 * - Plant is only "retired" when removed from the system
 */

import { apiDelete, apiGet, apiPost, apiPut, type ApiResponse } from "./apiService";

// Plant statuses:
// - seedling: Just planted, young growth
// - growing: Active vegetative growth (including regrowth after harvest)
// - mature: Ready for harvest
// - retired: Removed from the system
export type PlantStatus = 'seedling' | 'growing' | 'mature' | 'retired';
export type HarvestQuality = 'excellent' | 'good' | 'fair' | 'poor';

export interface Plant {
  id: number;
  device_id: number;
  plant_type: string;
  system_type: string;
  planting_date: string;
  status: PlantStatus;
  retired_at: string | null;
  notes: string | null;
  quantity: number;
  batch_name: string | null;
  created_at: string;
  updated_at: string;
  // Computed fields from backend
  plant_age_days: number;
  is_retired: boolean;
  harvest_count: number;
  last_harvest_date: string | null;
  growth_stage: 'seedling' | 'vegetative' | null;
  // Loaded relationships
  device?: {
    id: number;
    name: string;
    device_id: string;
  };
  harvests?: PlantHarvest[];
}

export interface PlantHarvest {
  id: number;
  plant_id: number;
  device_id: number;
  harvest_cycle: number; // 1st, 2nd, 3rd harvest, etc.
  harvest_date: string;
  quantity_harvested: number;
  yield_weight: number | null;
  quality: HarvestQuality | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Loaded relationships
  plant?: Partial<Plant>;
  device?: {
    id: number;
    name: string;
    device_id: string;
  };
}

export interface CreatePlantPayload {
  plant_type: string;
  system_type: string;
  planting_date: string; // YYYY-MM-DD format
  status?: PlantStatus;
  notes?: string | null;
  quantity?: number;
  batch_name?: string | null;
}

export interface UpdatePlantPayload {
  plant_type?: string;
  system_type?: string;
  planting_date?: string;
  status?: PlantStatus;
  notes?: string | null;
  quantity?: number;
  batch_name?: string | null;
}

export interface HarvestPlantPayload {
  harvest_date?: string; // YYYY-MM-DD format, defaults to today
  yield_weight?: number | null;
  quality?: HarvestQuality | null;
  notes?: string | null;
}

export interface RetirePlantPayload {
  retired_at?: string; // YYYY-MM-DD format, defaults to today
  reason?: string | null;
}

export interface PlantsListResponse extends ApiResponse<{ plants: Plant[] }> {}
export interface PlantResponse extends ApiResponse<{ plant: Plant }> {}
export interface HarvestResponse extends ApiResponse<{ plant: Plant; harvest: PlantHarvest }> {}
export interface RetireResponse extends ApiResponse<{ 
  plant: Plant; 
  summary: { total_harvests: number; days_active: number };
}> {}
export interface HarvestHistoryResponse extends ApiResponse<{
  harvests: PlantHarvest[];
  summary: {
    total_harvests: number;
    total_yield_weight: number;
    avg_yield_weight?: number;
  };
}> {}

// Plant type options (Lettuce only for LettuceGrow system)
export const PLANT_TYPES = [
  { label: 'Lettuce', value: 'lettuce' },
];

// System type options (NFT only for LettuceGrow system)
export const SYSTEM_TYPES = [
  { label: 'NFT (Nutrient Film Technique)', value: 'nft' },
];

// Plant status options (excluding 'retired' for user selection - retired is set via retire action)
export const PLANT_STATUSES: { label: string; value: PlantStatus; color: string; description: string }[] = [
  { label: 'Seedling', value: 'seedling', color: '#4CAF50', description: 'Just planted, young growth' },
  { label: 'Growing', value: 'growing', color: '#8BC34A', description: 'Active vegetative growth' },
  { label: 'Mature', value: 'mature', color: '#FFC107', description: 'Ready for harvest' },
  { label: 'Retired', value: 'retired', color: '#9E9E9E', description: 'Removed from system' },
];

// Harvest quality options
export const HARVEST_QUALITIES: { label: string; value: HarvestQuality; color: string }[] = [
  { label: 'Excellent', value: 'excellent', color: '#4CAF50' },
  { label: 'Good', value: 'good', color: '#8BC34A' },
  { label: 'Fair', value: 'fair', color: '#FFC107' },
  { label: 'Poor', value: 'poor', color: '#F44336' },
];

/**
 * Get all plants across all accessible devices
 */
export const getAllPlants = async (token: string): Promise<PlantsListResponse> => {
  const response = await apiGet<{ plants: Plant[] }>('/plants', token);
  
  // Debug: Log growth_stage for each plant
  if (response.success && response.data?.plants) {
    console.log('🌱 Plants loaded with growth stages:');
    response.data.plants.forEach((plant) => {
      console.log(`  Plant ${plant.id}: age=${plant.plant_age_days} days, growth_stage=${plant.growth_stage || 'null'}`);
    });
  }
  
  return response;
};

/**
 * Get plants for a specific device
 */
export const getPlantsByDevice = async (
  deviceId: number,
  token: string,
  status?: 'active' | 'retired'
): Promise<PlantsListResponse> => {
  const query = status ? `?status=${status}` : '';
  return apiGet<{ plants: Plant[] }>(`/devices/${deviceId}/plants${query}`, token);
};

/**
 * Get a specific plant
 */
export const getPlant = async (
  deviceId: number,
  plantId: number,
  token: string
): Promise<PlantResponse> => {
  return apiGet<{ plant: Plant }>(`/devices/${deviceId}/plants/${plantId}`, token);
};

/**
 * Create a new plant
 */
export const createPlant = async (
  deviceId: number,
  data: CreatePlantPayload,
  token: string
): Promise<PlantResponse> => {
  return apiPost<{ plant: Plant }>(`/devices/${deviceId}/plants`, data, token);
};

/**
 * Update a plant
 */
export const updatePlant = async (
  deviceId: number,
  plantId: number,
  data: UpdatePlantPayload,
  token: string
): Promise<PlantResponse> => {
  return apiPut<{ plant: Plant }>(`/devices/${deviceId}/plants/${plantId}`, data, token);
};

/**
 * Delete a plant
 */
export const deletePlant = async (
  deviceId: number,
  plantId: number,
  token: string
): Promise<ApiResponse> => {
  return apiDelete(`/devices/${deviceId}/plants/${plantId}`, token);
};

/**
 * Record a harvest for a plant (cut-and-come-again method).
 * The plant continues growing after harvest - can have multiple harvests.
 */
export const harvestPlant = async (
  deviceId: number,
  plantId: number,
  data: HarvestPlantPayload,
  token: string
): Promise<HarvestResponse> => {
  return apiPost<{ plant: Plant; harvest: PlantHarvest }>(
    `/devices/${deviceId}/plants/${plantId}/harvest`,
    data,
    token
  );
};

/**
 * Retire a plant (remove from the system).
 * Use this when the plant is no longer productive or needs to be replaced.
 */
export const retirePlant = async (
  deviceId: number,
  plantId: number,
  data: RetirePlantPayload,
  token: string
): Promise<RetireResponse> => {
  return apiPost<{ plant: Plant; summary: { total_harvests: number; days_active: number } }>(
    `/devices/${deviceId}/plants/${plantId}/retire`,
    data,
    token
  );
};

/**
 * Get harvest history for a specific device
 */
export const getHarvestHistory = async (
  deviceId: number,
  token: string
): Promise<HarvestHistoryResponse> => {
  return apiGet<{
    harvests: PlantHarvest[];
    summary: { total_harvests: number; total_yield_weight: number; avg_yield_weight?: number };
  }>(`/devices/${deviceId}/plants/harvests`, token);
};

/**
 * Get all harvest history across all accessible devices
 */
export const getAllHarvestHistory = async (token: string): Promise<HarvestHistoryResponse> => {
  return apiGet<{
    harvests: PlantHarvest[];
    summary: { total_harvests: number; total_yield_weight: number };
  }>('/plants/harvests', token);
};

/**
 * Format plant age for display
 */
export const formatPlantAge = (days: number): string => {
  if (days === 0) return 'Planted today';
  if (days === 1) return '1 day old';
  if (days < 7) return `${days} days old`;
  
  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;
  
  if (remainingDays === 0) {
    return weeks === 1 ? '1 week old' : `${weeks} weeks old`;
  }
  
  return weeks === 1 
    ? `1 week, ${remainingDays} day${remainingDays > 1 ? 's' : ''} old`
    : `${weeks} weeks, ${remainingDays} day${remainingDays > 1 ? 's' : ''} old`;
};

/**
 * Format harvest cycle for display (1st, 2nd, 3rd, etc.)
 */
export const formatHarvestCycle = (cycle: number): string => {
  const suffix = cycle === 1 ? 'st' : cycle === 2 ? 'nd' : cycle === 3 ? 'rd' : 'th';
  return `${cycle}${suffix} harvest`;
};

/**
 * Get status color
 */
export const getStatusColor = (status: PlantStatus): string => {
  return PLANT_STATUSES.find(s => s.value === status)?.color || '#9E9E9E';
};

/**
 * Get status label
 */
export const getStatusLabel = (status: PlantStatus): string => {
  return PLANT_STATUSES.find(s => s.value === status)?.label || status;
};

/**
 * Get plant type label
 */
export const getPlantTypeLabel = (type: string): string => {
  return PLANT_TYPES.find(t => t.value === type)?.label || type;
};

/**
 * Get system type label
 */
export const getSystemTypeLabel = (type: string): string => {
  return SYSTEM_TYPES.find(t => t.value === type)?.label || type;
};

/**
 * Calculate plant age from planting date
 */
export const calculatePlantAge = (plantingDate: string, retiredAt?: string | null): number => {
  const startDate = new Date(plantingDate);
  const endDate = retiredAt ? new Date(retiredAt) : new Date();
  
  // Reset time to compare dates only
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Check if plant can be harvested again
 * Typically lettuce can be harvested 2-3 times before quality degrades too much
 */
export const canHarvestAgain = (plant: Plant): boolean => {
  if (plant.is_retired) return false;
  // Typically limit to 3 harvests, but allow more if plant is still healthy
  return plant.harvest_count < 3;
};

/**
 * Get harvest recommendation based on harvest count
 */
export const getHarvestRecommendation = (harvestCount: number): string => {
  if (harvestCount === 0) return 'First harvest - expect best quality and yield';
  if (harvestCount === 1) return 'Second harvest - slightly smaller leaves expected';
  if (harvestCount === 2) return 'Third harvest - consider retiring after this harvest';
  return 'Multiple harvests done - quality may be degraded, consider retiring';
};

/**
 * Get growth stage label
 */
export const getGrowthStageLabel = (stage: 'seedling' | 'vegetative' | null): string => {
  if (stage === 'seedling') return 'Seedling';
  if (stage === 'vegetative') return 'Vegetative';
  return 'Unknown';
};

/**
 * Get growth stage color
 */
export const getGrowthStageColor = (stage: 'seedling' | 'vegetative' | null): string => {
  if (stage === 'seedling') return '#4CAF50'; // Green
  if (stage === 'vegetative') return '#2196F3'; // Blue
  return '#9E9E9E'; // Gray
};

/**
 * Get pH range for growth stage
 * Note: pH range is static (5.5-6.5) for all growth stages
 */
export const getGrowthStagePHRange = (stage: 'seedling' | 'vegetative' | null): { min: number; max: number; target: number } | null => {
  if (stage === 'seedling' || stage === 'vegetative') {
    return { min: 5.5, max: 6.5, target: 6.0 };
  }
  return null;
};

/**
 * Get EC range for growth stage
 * Note: EC range varies by growth stage
 */
export const getGrowthStageECRange = (stage: 'seedling' | 'vegetative' | null): { min: number; max: number; target: number } | null => {
  if (stage === 'seedling') {
    return { min: 0.8, max: 1.2, target: 1.0 };
  }
  if (stage === 'vegetative') {
    return { min: 1.5, max: 2.5, target: 2.0 };
  }
  return null;
};
