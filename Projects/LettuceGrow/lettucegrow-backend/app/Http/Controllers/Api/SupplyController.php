<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SmartDevice;
use App\Models\Supply;
use App\Models\SupplyHistory;
use Illuminate\Http\Request;

class SupplyController extends Controller
{
    /**
     * List supplies for all smart devices owned by the authenticated user.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $supplies = $this->ensureDefaultsForUser($user->id);

        return response()->json([
            'success' => true,
            'data' => [
                'supplies' => $supplies,
            ],
        ]);
    }

    /**
     * Update a single supply record for the authenticated user.
     */
    public function update(Request $request, Supply $supply)
    {
        $user = $request->user();

        // Only owner can update supplies
        if (! $supply->smartDevice || $supply->smartDevice->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'error' => 'You do not have permission to update this supply.',
            ], 403);
        }

        $validated = $request->validate([
            'status' => ['sometimes', 'required', 'in:in_stock,need_refilled'],
        ]);

        $originalStatus = $supply->status;

        if (array_key_exists('status', $validated)) {
            $supply->status = $validated['status'];
        }

        $supply->save();

        if ($originalStatus !== $supply->status) {
            SupplyHistory::create([
                'supply_id' => $supply->id,
                'smart_device_id' => $supply->smart_device_id,
                'from_status' => $originalStatus,
                'to_status' => $supply->status,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Supply updated successfully.',
            'data' => [
                'supply' => $supply,
            ],
        ]);
    }

    /**
     * Ensure a complete set of supply rows exists for each smart device accessible by the given user (owned + shared).
     */
    protected function ensureDefaultsForUser(int $userId)
    {
        // Get owned devices
        $ownedDevices = SmartDevice::where('user_id', $userId)->get();
        
        // Get shared devices
        $sharedDevices = SmartDevice::whereHas('shares', function ($query) use ($userId) {
                $query->where('shared_with_user_id', $userId);
            })
            ->get();
        
        // Merge all accessible devices
        $devices = $ownedDevices->merge($sharedDevices);

        if ($devices->isEmpty()) {
            return collect();
        }

        $types = [
            'nutrient_a' => 'Nutrient A',
            'nutrient_b' => 'Nutrient B',
            'ph_up' => 'pH Up',
            'ph_down' => 'pH Down',
            'hydrogen_peroxide' => 'Hydrogen Peroxide',
            'water_tank' => 'Water Tank',
        ];

        foreach ($devices as $device) {
            foreach ($types as $type => $label) {
                Supply::firstOrCreate(
                    [
                        'smart_device_id' => $device->id,
                        'type' => $type,
                    ],
                    [
                        'display_name' => $label,
                        'status' => 'in_stock',
                    ],
                );
            }
        }

        return Supply::whereIn('smart_device_id', $devices->pluck('id'))
            ->orderBy('smart_device_id')
            ->orderBy('type')
            ->get();
    }

    /**
     * Get recent supply status changes for the authenticated user's devices.
     */
    public function history(Request $request)
    {
        $user = $request->user();

        // Get owned devices
        $ownedDeviceIds = SmartDevice::where('user_id', $user->id)->pluck('id');
        
        // Get shared devices
        $sharedDeviceIds = SmartDevice::whereHas('shares', function ($query) use ($user) {
                $query->where('shared_with_user_id', $user->id);
            })
            ->pluck('id');
        
        // Merge all accessible device IDs
        $devices = $ownedDeviceIds->merge($sharedDeviceIds);

        if ($devices->isEmpty()) {
            return response()->json([
                'success' => true,
                'data' => [
                    'history' => [],
                ],
            ]);
        }

        $history = SupplyHistory::with(['supply', 'smartDevice'])
            ->whereIn('smart_device_id', $devices)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'history' => $history,
            ],
        ]);
    }
}
