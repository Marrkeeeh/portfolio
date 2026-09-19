<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SmartDevice;
use App\Models\phLevel as PhLevel;
use App\Models\ECLevel;
use App\Models\DissolvedOxygen;
use App\Models\Temperature;
use App\Models\Turbidity;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DeviceController extends Controller
{
    /**
     * List devices for the authenticated user (owned + shared).
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Get owned devices
        $ownedDevices = SmartDevice::where('user_id', $user->id)->get();
        
        // Get shared devices (exclude devices already owned by user)
        $ownedDeviceIds = $ownedDevices->pluck('id')->toArray();
        $sharedDevices = SmartDevice::whereHas('shares', function ($query) use ($user) {
                $query->where('shared_with_user_id', $user->id);
            })
            ->when(!empty($ownedDeviceIds), function ($query) use ($ownedDeviceIds) {
                $query->whereNotIn('id', $ownedDeviceIds);
            })
            ->get();

        // Convert to arrays with metadata
        $devicesArray = [];
        
        foreach ($ownedDevices as $device) {
            $deviceArray = $device->toArray();
            $deviceArray['is_shared'] = false;
            $deviceArray['is_owner'] = true;
            $devicesArray[] = $deviceArray;
        }
        
        foreach ($sharedDevices as $device) {
            $deviceArray = $device->toArray();
            $deviceArray['is_shared'] = true;
            $deviceArray['is_owner'] = false;
            $devicesArray[] = $deviceArray;
        }
        
        // Sort by date_installed (handle null values)
        usort($devicesArray, function ($a, $b) {
            $dateA = $a['date_installed'] ?? $a['date_added'] ?? $a['created_at'] ?? null;
            $dateB = $b['date_installed'] ?? $b['date_added'] ?? $b['created_at'] ?? null;
            
            $timestampA = $dateA ? strtotime($dateA) : 0;
            $timestampB = $dateB ? strtotime($dateB) : 0;
            
            return $timestampB <=> $timestampA; // Descending order
        });

        return response()->json([
            'success' => true,
            'data' => [
                'devices' => $devicesArray,
            ],
        ]);
    }

    /**
     * Claim an existing device by device_id.
     *
     * Rules:
     * - If device_id does not exist: error "Device not found".
     * - If device already owned by another user: error "Device already claimed by another user".
     * - If device already owned by this user: error "Device already added to your account".
     * - If unclaimed: attach to current user and update metadata.
     */
    public function claim(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'device_id' => ['required', 'string'],
            'name' => ['required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'plant_growth' => ['nullable', 'array'],
            'settings' => ['nullable', 'array'],
            'wifi_data' => ['nullable', 'array'],
            'device_pin' => ['required', 'string', 'regex:/^\d{6}$/'],
        ]);

        $device = SmartDevice::where('device_id', $validated['device_id'])->first();

        if (! $device) {
            return response()->json([
                'success' => false,
                'error' => 'Device not found.',
                'code' => 'not_found',
            ], 404);
        }

        if ($device->user_id && $device->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'error' => 'This device is already claimed by another user.',
                'code' => 'owned_by_other',
            ], 409);
        }

        if ($device->user_id === $user->id) {
            return response()->json([
                'success' => false,
                'error' => 'This device is already added to your account.',
                'code' => 'already_owned',
            ], 409);
        }

        $providedPin = $validated['device_pin'];

        if ($device->device_pin) {
            $hashedProvided = substr(hash('sha256', $providedPin), 0, 32);

            if (! hash_equals($device->device_pin, $hashedProvided)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Incorrect device PIN.',
                    'code' => 'pin_mismatch',
                ], 403);
            }
        } else {
            $device->device_pin = substr(hash('sha256', $providedPin), 0, 32);
        }

        $now = now();

        $device->user_id = $user->id;
        $device->name = $validated['name'];
        $device->location = $validated['location'] ?? null;
        $device->status = 'active';
        $device->date_added = $device->date_added ?? $now;
        $device->date_installed = $now;

        if (array_key_exists('plant_growth', $validated)) {
            $device->plant_growth = $validated['plant_growth'];
        }

        if (array_key_exists('settings', $validated)) {
            $device->settings = $validated['settings'];
        }

        $device->save();

        return response()->json([
            'success' => true,
            'message' => 'Device claimed successfully.',
            'data' => [
                'device' => $device,
            ],
        ]);
    }

    /**
     * Get a single device (owned or shared with the authenticated user).
     */
    public function show(Request $request, SmartDevice $device)
    {
        $user = $request->user();

        // Check if user has access (owner or shared)
        if (!$device->isAccessibleBy($user->id)) {
            return response()->json([
                'success' => false,
                'error' => 'Device not found.',
            ], 404);
        }

        // Add metadata about ownership
        $device->is_owner = ($device->user_id === $user->id);
        $device->is_shared = !$device->is_owner;

        return response()->json([
            'success' => true,
            'data' => [
                'device' => $device,
            ],
        ]);
    }

    /**
     * Update a device's metadata (only owner can update).
     */
    public function update(Request $request, SmartDevice $device)
    {
        $user = $request->user();

        // Only owner can update
        if ($device->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'error' => 'You do not have permission to update this device.',
            ], 403);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'in:unclaimed,claimed,active,inactive'],
            'plant_growth' => ['sometimes', 'nullable', 'array'],
            'settings' => ['sometimes', 'nullable', 'array'],
            'wifi_data' => ['sometimes', 'nullable', 'array'],
            'device_pin' => ['sometimes', 'nullable', 'string', 'regex:/^\d{6}$/'],
        ]);

        if (array_key_exists('name', $validated)) {
            $device->name = $validated['name'];
        }

		if (array_key_exists('location', $validated)) {
			$device->location = $validated['location'];
		}

		if (array_key_exists('status', $validated)) {
			$device->status = $validated['status'];
		}

		if (array_key_exists('plant_growth', $validated)) {
			$device->plant_growth = $validated['plant_growth'];
		}

		if (array_key_exists('settings', $validated)) {
			$device->settings = $validated['settings'];
		}

		if (array_key_exists('wifi_data', $validated)) {
			$device->wifi_data = $validated['wifi_data'];
		}

		if (array_key_exists('device_pin', $validated)) {
			$device->device_pin = $validated['device_pin'] !== null
				? substr(hash('sha256', $validated['device_pin']), 0, 32)
				: null;
		}

		$device->save();

		return response()->json([
			'success' => true,
			'message' => 'Device updated successfully.',
			'data' => [
				'device' => $device,
			],
		]);
	}

	/**
	 * Remove (unclaim) a device from the authenticated user's account.
	 */
	public function destroy(Request $request, SmartDevice $device)
	{
		$user = $request->user();

		if ($device->user_id !== $user->id) {
			return response()->json([
				'success' => false,
				'error' => 'Device not found.',
			], 404);
		}

		// Unclaim the device but keep it in the system so it can be claimed again later
		$device->user_id = null;
		$device->status = 'unclaimed';
		$device->location = null;
		$device->date_installed = null;
		$device->plant_growth = null;
		$device->settings = null;
		$device->save();

		return response()->json([
			'success' => true,
			'message' => 'Device removed from your account.',
		]);
	}

	/**
	 * Get historical sensor data for analytics, grouped by week.
	 */
	public function sensorHistory(Request $request, SmartDevice $device)
	{
		$user = $request->user();

		// Check if user has access (owner or shared)
		if (!$device->isAccessibleBy($user->id)) {
			return response()->json([
				'success' => false,
				'error' => 'Device not found.',
			], 404);
		}

		$weeks = (int) ($request->query('weeks', 4)); // Default to 4 weeks
		$weeks = max(1, min(12, $weeks)); // Limit between 1 and 12 weeks

		$startDate = Carbon::now()->subWeeks($weeks)->startOfWeek();
		$endDate = Carbon::now();

		// Get recent values (last 10 readings for each sensor)
		$recentValues = [
			'ph' => PhLevel::where('smart_device_id', $device->id)
				->orderBy('created_at', 'desc')
				->limit(10)
				->get()
				->map(fn($item) => [
					'value' => $item->value,
					'timestamp' => $item->created_at->toIso8601String(),
				])
				->reverse()
				->values(),
			'ec' => ECLevel::where('smart_device_id', $device->id)
				->orderBy('created_at', 'desc')
				->limit(10)
				->get()
				->map(fn($item) => [
					'value' => $item->value,
					'timestamp' => $item->created_at->toIso8601String(),
				])
				->reverse()
				->values(),
			'temperature' => Temperature::where('smart_device_id', $device->id)
				->orderBy('created_at', 'desc')
				->limit(10)
				->get()
				->map(fn($item) => [
					'value' => $item->value,
					'timestamp' => $item->created_at->toIso8601String(),
				])
				->reverse()
				->values(),
			'dissolved_oxygen' => DissolvedOxygen::where('smart_device_id', $device->id)
				->orderBy('created_at', 'desc')
				->limit(10)
				->get()
				->map(fn($item) => [
					'value' => $item->value,
					'timestamp' => $item->created_at->toIso8601String(),
				])
				->reverse()
				->values(),
			'turbidity' => Turbidity::where('smart_device_id', $device->id)
				->orderBy('created_at', 'desc')
				->limit(10)
				->get()
				->map(fn($item) => [
					'value' => $item->value,
					'timestamp' => $item->created_at->toIso8601String(),
				])
				->reverse()
				->values(),
		];

		// Helper function to get weekly averages
		$getWeeklyAverages = function ($model, $deviceId, $startDate, $endDate) {
			return $model::where('smart_device_id', $deviceId)
				->whereBetween('created_at', [$startDate, $endDate])
				->select(
					DB::raw('YEARWEEK(created_at, 1) as week'),
					DB::raw('AVG(value) as avg_value'),
					DB::raw('MIN(value) as min_value'),
					DB::raw('MAX(value) as max_value'),
					DB::raw('COUNT(*) as count'),
					DB::raw('MIN(created_at) as week_start'),
					DB::raw('MAX(created_at) as week_end')
				)
				->groupBy('week')
				->orderBy('week', 'asc')
				->get()
				->map(function ($item) {
					return [
						'week' => $item->week,
						'avg' => round((float) $item->avg_value, 2),
						'min' => round((float) $item->min_value, 2),
						'max' => round((float) $item->max_value, 2),
						'count' => (int) $item->count,
						'week_start' => Carbon::parse($item->week_start)->toIso8601String(),
						'week_end' => Carbon::parse($item->week_end)->toIso8601String(),
					];
				})
				->values();
		};

		// Get weekly trends
		$weeklyTrends = [
			'ph' => $getWeeklyAverages(PhLevel::class, $device->id, $startDate, $endDate),
			'ec' => $getWeeklyAverages(ECLevel::class, $device->id, $startDate, $endDate),
			'temperature' => $getWeeklyAverages(Temperature::class, $device->id, $startDate, $endDate),
			'dissolved_oxygen' => $getWeeklyAverages(DissolvedOxygen::class, $device->id, $startDate, $endDate),
			'turbidity' => $getWeeklyAverages(Turbidity::class, $device->id, $startDate, $endDate),
		];

		return response()->json([
			'success' => true,
			'data' => [
				'recent_values' => $recentValues,
				'weekly_trends' => $weeklyTrends,
				'period' => [
					'start' => $startDate->toIso8601String(),
					'end' => $endDate->toIso8601String(),
					'weeks' => $weeks,
				],
			],
		]);
	}

	/**
	 * Get control history for a device.
	 */
	public function controlHistory(Request $request, SmartDevice $device)
	{
		$user = $request->user();

		// Check if user has access (owner or shared)
		if (!$device->isAccessibleBy($user->id)) {
			return response()->json([
				'success' => false,
				'error' => 'Device not found.',
			], 404);
		}

		$limit = (int) ($request->query('limit', 50));
		$limit = max(1, min(100, $limit)); // Limit between 1 and 100 entries

		// Get control history from database
		$controlHistory = $device->controlHistories()
			->orderBy('timestamp', 'desc')
			->orderBy('created_at', 'desc')
			->limit($limit)
			->get()
			->map(function ($item) {
				return [
					'id' => (string) $item->id,
					'type' => $item->type,
					'event' => $item->event,
					'title' => $item->title,
					'description' => $item->description,
					'progress' => $item->progress,
					'notification_type' => $item->notification_type,
					'timestamp' => $item->timestamp->toIso8601String(),
					'created_at' => $item->created_at->toIso8601String(),
				];
			})
			->toArray();

		return response()->json([
			'success' => true,
			'data' => [
				'history' => $controlHistory,
			],
		]);
	}
}
