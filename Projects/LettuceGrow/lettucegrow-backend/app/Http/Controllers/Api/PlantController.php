<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plant;
use App\Models\PlantHarvest;
use App\Models\SmartDevice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class PlantController extends Controller
{
    /**
     * List all plants for the authenticated user (across all accessible devices).
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        // Get all device IDs accessible by this user
        $deviceIds = $user->accessibleDevices()->pluck('id')->toArray();
        
        $plants = Plant::whereIn('device_id', $deviceIds)
            ->with(['device:id,name,device_id', 'harvests'])
            ->orderByDesc('planting_date')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'plants' => $plants,
            ],
        ]);
    }

    /**
     * List plants for a specific device.
     */
    public function listByDevice(Request $request, SmartDevice $device)
    {
        $user = $request->user();
        
        // Check if user has access to this device
        if (!$device->isAccessibleBy($user->id)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have access to this device.',
            ], 403);
        }

        $status = $request->query('status'); // 'active', 'retired', or null for all
        
        $query = Plant::forDevice($device->id)->with('harvests');
        
        if ($status === 'active') {
            $query->active();
        } elseif ($status === 'retired') {
            $query->retired();
        }
        
        $plants = $query->orderByDesc('planting_date')->get();

        return response()->json([
            'success' => true,
            'data' => [
                'plants' => $plants,
            ],
        ]);
    }

    /**
     * Store a new plant.
     */
    public function store(Request $request, SmartDevice $device)
    {
        $user = $request->user();
        
        // Check if user owns this device (only owners can add plants)
        if ($device->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Only device owners can add plants.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'plant_type' => 'required|string|max:100',
            'system_type' => 'required|string|max:50',
            'planting_date' => 'required|date|before_or_equal:today',
            'status' => 'sometimes|in:seedling,growing,mature',
            'notes' => 'nullable|string',
            'quantity' => 'sometimes|integer|min:1',
            'batch_name' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check if device already has an active plant
        $hasActivePlant = Plant::forDevice($device->id)
            ->whereNot('status', Plant::STATUS_RETIRED)
            ->exists();

        if ($hasActivePlant) {
            return response()->json([
                'success' => false,
                'message' => 'This device already has an active plant. Please retire the current plant before adding a new one.',
                'code' => 'device_has_active_plant',
            ], 422);
        }

        $plant = Plant::create([
            'device_id' => $device->id,
            'plant_type' => $request->plant_type,
            'system_type' => $request->system_type,
            'planting_date' => $request->planting_date,
            'status' => $request->status ?? 'seedling',
            'notes' => $request->notes,
            'quantity' => $request->quantity ?? 1,
            'batch_name' => $request->batch_name,
        ]);

        // Update device's plant_growth settings
        $this->updateDevicePlantGrowth($device, $plant);

        $plant->load('harvests');

        return response()->json([
            'success' => true,
            'message' => 'Plant added successfully',
            'data' => [
                'plant' => $plant,
            ],
        ], 201);
    }

    /**
     * Show a specific plant.
     */
    public function show(Request $request, SmartDevice $device, Plant $plant)
    {
        $user = $request->user();
        
        // Check if user has access to this device
        if (!$device->isAccessibleBy($user->id)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have access to this device.',
            ], 403);
        }

        // Ensure plant belongs to this device
        if ($plant->device_id !== $device->id) {
            return response()->json([
                'success' => false,
                'message' => 'Plant not found for this device.',
            ], 404);
        }

        $plant->load('harvests');

        return response()->json([
            'success' => true,
            'data' => [
                'plant' => $plant,
            ],
        ]);
    }

    /**
     * Update a plant.
     */
    public function update(Request $request, SmartDevice $device, Plant $plant)
    {
        $user = $request->user();
        
        // Check if user owns this device (only owners can update plants)
        if ($device->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Only device owners can update plants.',
            ], 403);
        }

        // Ensure plant belongs to this device
        if ($plant->device_id !== $device->id) {
            return response()->json([
                'success' => false,
                'message' => 'Plant not found for this device.',
            ], 404);
        }

        // Cannot update retired plants
        if ($plant->status === Plant::STATUS_RETIRED) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot update a retired plant.',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'plant_type' => 'sometimes|required|string|max:100',
            'system_type' => 'sometimes|required|string|max:50',
            'planting_date' => 'sometimes|required|date|before_or_equal:today',
            'status' => 'sometimes|in:seedling,growing,mature',
            'notes' => 'nullable|string',
            'quantity' => 'sometimes|integer|min:1',
            'batch_name' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $plant->fill($request->only([
            'plant_type',
            'system_type',
            'planting_date',
            'status',
            'notes',
            'quantity',
            'batch_name',
        ]));

        $plant->save();

        // Update device's plant_growth settings
        $this->updateDevicePlantGrowth($device, $plant);

        $plant->load('harvests');

        return response()->json([
            'success' => true,
            'message' => 'Plant updated successfully',
            'data' => [
                'plant' => $plant,
            ],
        ]);
    }

    /**
     * Delete a plant.
     */
    public function destroy(Request $request, SmartDevice $device, Plant $plant)
    {
        $user = $request->user();
        
        // Check if user owns this device (only owners can delete plants)
        if ($device->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Only device owners can delete plants.',
            ], 403);
        }

        // Ensure plant belongs to this device
        if ($plant->device_id !== $device->id) {
            return response()->json([
                'success' => false,
                'message' => 'Plant not found for this device.',
            ], 404);
        }

        $plant->delete();

        return response()->json([
            'success' => true,
            'message' => 'Plant deleted successfully',
        ]);
    }

    /**
     * Record a harvest for a plant (cut-and-come-again method).
     * The plant continues growing after harvest - can have multiple harvests.
     */
    public function harvest(Request $request, SmartDevice $device, Plant $plant)
    {
        $user = $request->user();
        
        // Check if user owns this device (only owners can harvest)
        if ($device->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Only device owners can harvest plants.',
            ], 403);
        }

        // Ensure plant belongs to this device
        if ($plant->device_id !== $device->id) {
            return response()->json([
                'success' => false,
                'message' => 'Plant not found for this device.',
            ], 404);
        }

        // Check if plant is retired
        if ($plant->status === Plant::STATUS_RETIRED) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot harvest a retired plant.',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'harvest_date' => 'sometimes|date|after_or_equal:' . $plant->planting_date->toDateString() . '|before_or_equal:today',
            'yield_weight' => 'nullable|numeric|min:0',
            'quality' => 'nullable|in:excellent,good,fair,poor',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $harvestDate = $request->harvest_date ?? Carbon::today()->toDateString();

        // Get the next harvest cycle number
        $harvestCycle = $plant->harvests()->count() + 1;

        // Create harvest record
        $harvest = PlantHarvest::create([
            'plant_id' => $plant->id,
            'device_id' => $device->id,
            'harvest_cycle' => $harvestCycle,
            'harvest_date' => $harvestDate,
            'quantity_harvested' => $plant->quantity,
            'yield_weight' => $request->yield_weight,
            'quality' => $request->quality,
            'notes' => $request->notes,
        ]);

        // After harvest, plant goes back to growing status (regrowth phase)
        // Typically takes 7-10 days to produce new leaves
        if ($plant->status === Plant::STATUS_MATURE) {
            $plant->status = Plant::STATUS_GROWING;
            $plant->save();
        }

        $plant->load('harvests');

        return response()->json([
            'success' => true,
            'message' => "Harvest #{$harvestCycle} recorded successfully. Plant will continue growing for next harvest.",
            'data' => [
                'plant' => $plant->fresh()->load('harvests'),
                'harvest' => $harvest,
            ],
        ]);
    }

    /**
     * Retire a plant (remove from the system).
     * Use this when the plant is no longer productive or needs to be replaced.
     */
    public function retire(Request $request, SmartDevice $device, Plant $plant)
    {
        $user = $request->user();
        
        // Check if user owns this device (only owners can retire plants)
        if ($device->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Only device owners can retire plants.',
            ], 403);
        }

        // Ensure plant belongs to this device
        if ($plant->device_id !== $device->id) {
            return response()->json([
                'success' => false,
                'message' => 'Plant not found for this device.',
            ], 404);
        }

        // Check if already retired
        if ($plant->status === Plant::STATUS_RETIRED) {
            return response()->json([
                'success' => false,
                'message' => 'This plant is already retired.',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'retired_at' => 'sometimes|date|after_or_equal:' . $plant->planting_date->toDateString() . '|before_or_equal:today',
            'reason' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $retiredAt = $request->retired_at ?? Carbon::today()->toDateString();

        // Update plant status to retired
        $plant->status = Plant::STATUS_RETIRED;
        $plant->retired_at = $retiredAt;
        
        // Optionally add retirement reason to notes
        if ($request->reason) {
            $plant->notes = $plant->notes 
                ? $plant->notes . "\n\nRetired: " . $request->reason
                : "Retired: " . $request->reason;
        }
        
        $plant->save();

        // Update device's plant_growth settings (will use next active plant if any)
        $this->updateDevicePlantGrowth($device, $plant);

        $plant->load('harvests');

        return response()->json([
            'success' => true,
            'message' => 'Plant retired successfully. It has been removed from active growing.',
            'data' => [
                'plant' => $plant,
                'summary' => [
                    'total_harvests' => $plant->harvest_count,
                    'days_active' => $plant->plant_age_days,
                ],
            ],
        ]);
    }

    /**
     * Get harvest history for a device.
     */
    public function harvestHistory(Request $request, SmartDevice $device)
    {
        $user = $request->user();
        
        // Check if user has access to this device
        if (!$device->isAccessibleBy($user->id)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have access to this device.',
            ], 403);
        }

        $harvests = PlantHarvest::where('device_id', $device->id)
            ->with('plant:id,plant_type,system_type,planting_date,batch_name,status')
            ->orderByDesc('harvest_date')
            ->get();

        // Calculate summary statistics
        $totalHarvests = $harvests->count();
        $totalYieldWeight = $harvests->sum('yield_weight');
        $avgYieldWeight = $totalHarvests > 0 ? $totalYieldWeight / $totalHarvests : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'harvests' => $harvests,
                'summary' => [
                    'total_harvests' => $totalHarvests,
                    'total_yield_weight' => round($totalYieldWeight, 2),
                    'avg_yield_weight' => round($avgYieldWeight, 2),
                ],
            ],
        ]);
    }

    /**
     * Get all harvest history across all accessible devices.
     */
    public function allHarvestHistory(Request $request)
    {
        $user = $request->user();
        
        // Get all device IDs accessible by this user
        $deviceIds = $user->accessibleDevices()->pluck('id')->toArray();

        $harvests = PlantHarvest::whereIn('device_id', $deviceIds)
            ->with([
                'plant:id,plant_type,system_type,planting_date,batch_name,status',
                'device:id,name,device_id',
            ])
            ->orderByDesc('harvest_date')
            ->get();

        // Calculate summary statistics
        $totalHarvests = $harvests->count();
        $totalYieldWeight = $harvests->sum('yield_weight');

        return response()->json([
            'success' => true,
            'data' => [
                'harvests' => $harvests,
                'summary' => [
                    'total_harvests' => $totalHarvests,
                    'total_yield_weight' => round($totalYieldWeight, 2),
                ],
            ],
        ]);
    }

    /**
     * Update the device's plant_growth settings with the most recent active plant.
     */
    private function updateDevicePlantGrowth(SmartDevice $device, Plant $plant): void
    {
        // Get the most recent active plant for this device
        $activePlant = Plant::forDevice($device->id)
            ->active()
            ->orderByDesc('planting_date')
            ->first();

        if ($activePlant) {
            // Recalculate plant age from planting_date to ensure accuracy
            $plantingDate = Carbon::parse($activePlant->planting_date);
            $currentAgeDays = (int) Carbon::today()->diffInDays($plantingDate);
            
            // Store plant growth info in device settings
            $device->plant_growth = [
                'plant_type' => $activePlant->plant_type,
                'system_type' => $activePlant->system_type,
                'planting_date' => $activePlant->planting_date->toDateString(),
                'plant_age_days' => $currentAgeDays, // Recalculated daily
                'plant_id' => $activePlant->id,
                'harvest_count' => $activePlant->harvest_count,
            ];
            
            $device->save();
        } else {
            // No active plants, clear plant_growth
            $device->plant_growth = null;
            $device->save();
        }
    }
}
