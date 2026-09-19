<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Events\DeviceDataUpdated;
use App\Models\SmartDevice;
use App\Models\Plant;
use App\Models\Supply;
use App\Models\phLevel as PhLevel;
use App\Models\ECLevel;
use App\Models\DissolvedOxygen;
use App\Models\Temperature;
use App\Models\Turbidity;
use App\Models\SensorDataEvaluation;
use App\Models\ControlHistory;
use Illuminate\Http\Request;
use App\Services\LettuceGrowRulesServices;
use App\Services\Notification\PushNotificationService;
use App\DTOs\NotificationDTO;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class IoTDeviceController extends Controller
{
    public function __construct(
        private LettuceGrowRulesServices $rulesService,
        private PushNotificationService $pushNotificationService,
    ) {
    }

    /**
     * Ingest data from an ESP32 device and return control settings + flags.
     */
    public function ingest(Request $request)
    {
        $validated = $request->validate([
            'deviceNumber' => ['required', 'string'],
            'devicePin' => ['required', 'string', 'regex:/^\d{6}$/'],
            'deviceData' => ['required', 'array'],
        ]);

        $device = SmartDevice::where('device_id', $validated['deviceNumber'])->first();

        if (! $device) {
            return response()->json([
                'success' => false,
                'error' => 'Device not found.',
                'code' => 'not_found',
            ], 404);
        }
        
        Log::info("ESP32 Data Request - Device found: ID={$device->id}, device_id='{$device->device_id}', Name='{$device->name}'");

        $providedPin = $validated['devicePin'];

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
            // If the device does not yet have a PIN set, lock it to this one
            $device->device_pin = substr(hash('sha256', $providedPin), 0, 32);
        }

        $payload = $validated['deviceData'];

        // ---- Wi-Fi data ----
        $existingWifi = $device->wifi_data ?? [];
        $resetRequested = ! empty($existingWifi['reset_requested']);

        // Merge incoming wifi_data from device
        $incomingWifi = isset($payload['wifi_data']) && is_array($payload['wifi_data'])
            ? $payload['wifi_data']
            : [];

        if ($resetRequested) {
            // Clear the reset flag after the ESP32 has seen it
            unset($existingWifi['reset_requested']);
        }

        $device->wifi_data = array_merge($existingWifi, $incomingWifi);

        // ---- Telemetry (optional, stored under settings.telemetry) ----
        $settings = $device->settings ?? [];
        if (! is_array($settings)) {
            $settings = [];
        }

        $previousTelemetry = $settings['telemetry'] ?? [];
        $previousAlertState = $settings['rules_alert_state'] ?? [];
        if (! is_array($previousAlertState)) {
            $previousAlertState = [];
        }

        $currentTelemetry = [
            'ph_level' => $payload['phLevel'] ?? null,
            'do_data' => $payload['doData'] ?? null,
            'ec_level' => $payload['ecLevel'] ?? null,
            'temperature' => $payload['temperature'] ?? null,
            'turbidity' => $payload['turbidity'] ?? null,
            'reported_at' => now()->toIso8601String(),
        ];

        $settings['telemetry'] = $currentTelemetry;
        
        // Handle algae control completion signal from ESP32
        if (isset($payload['algae_control_completed']) && $payload['algae_control_completed'] === true) {
            // Record that algae control was completed
            $settings['last_algae_treatment'] = now()->toIso8601String();
            
            // Clear any pending auto-trigger flag
            if (isset($settings['auto_trigger_sent'])) {
                unset($settings['auto_trigger_sent']);
            }
            
            // Clear auto-trigger acknowledgment flag
            if (isset($settings['auto_trigger_acknowledged'])) {
                unset($settings['auto_trigger_acknowledged']);
            }
            
            // Send push notification for algae cleaning completion
            if ($device->user_id) {
                try {
                    $notificationDto = new NotificationDTO(
                        title: 'Algae Cleaning Complete',
                        body: 'The algae treatment has been completed successfully. Your system is now clean and optimized.',
                        data: [
                            'type' => 'algae_cleaning_complete',
                            'controlType' => 'algae',
                            'device_id' => (string) $device->id,
                            'device_uid' => $device->device_id,
                            'screen' => '/(app)/(drawer)/device-status',
                        ],
                        userId: $device->user_id,
                        sound: 'default',
                    );
                    $this->pushNotificationService->sendToUser($notificationDto);
                    Log::info("Device {$device->id}: Sent algae cleaning completion notification");
                    
                    // Log notification to history
                    $this->logNotificationToHistory(
                        $device,
                        'Algae Cleaning Complete',
                        'The algae treatment has been completed successfully. Your system is now clean and optimized.',
                        'algae_cleaning_complete'
                    );
                } catch (\Exception $e) {
                    Log::error('Failed to send algae cleaning completion notification: ' . $e->getMessage());
                }
            }
            
            Log::info("Device {$device->id}: Algae control completed - updated last_algae_treatment timestamp");
        }
        
        // Handle algae control acknowledgment from ESP32 (when it starts processing)
        if (isset($payload['algae_control_acknowledged']) && $payload['algae_control_acknowledged'] === true) {
            $settings['auto_trigger_acknowledged'] = now()->toIso8601String();
            Log::info("Device {$device->id}: Algae control auto-trigger acknowledged by ESP32");
        }
        
        // Store control status if provided and track history
        $controlStatusChanged = false;
        if (isset($payload['control_status']) && is_array($payload['control_status'])) {
            $previousControlStatus = $settings['control_status'] ?? null;
            $newControlStatus = [
                'type' => $payload['control_status']['type'] ?? 'idle',
                'state' => $payload['control_status']['state'] ?? 'idle',
                'progress' => isset($payload['control_status']['progress']) ? (int) $payload['control_status']['progress'] : 0,
                'elapsed' => isset($payload['control_status']['elapsed']) ? (int) $payload['control_status']['elapsed'] : 0,
                'total' => isset($payload['control_status']['total']) ? (int) $payload['control_status']['total'] : 0,
                'description' => $payload['control_status']['description'] ?? '',
                'updated_at' => now()->toIso8601String(),
            ];

            $previousType = $previousControlStatus['type'] ?? 'idle';
            $newType = $newControlStatus['type'];
            $previousProgress = $previousControlStatus['progress'] ?? 0;
            $newProgress = $newControlStatus['progress'];
            $previousElapsed = $previousControlStatus['elapsed'] ?? 0;
            $newElapsed = $newControlStatus['elapsed'];
            
            // Check if control status actually changed
            // Include elapsed time changes so real-time updates work during stirring/mixing
            $controlStatusChanged = (
                $previousType !== $newType ||
                ($previousControlStatus['state'] ?? '') !== $newControlStatus['state'] ||
                $previousProgress !== $newProgress ||
                $previousElapsed !== $newElapsed
            );

            // Track when control starts (idle -> active) and send notification
            if ($previousType === 'idle' && $newType !== 'idle') {
                $controlTitle = $this->getControlTitle($newType);
                
                // Log to database
                $this->logControlEvent(
                    $device,
                    $newType,
                    'started',
                    $controlTitle,
                    $newControlStatus['description']
                );

                // Send push notification to device owner
                if ($device->user_id) {
                    try {
                        Log::info("Device {$device->id}: Sending control started notification for {$newType}");
                        $notificationDto = new NotificationDTO(
                            title: $controlTitle,
                            body: $newControlStatus['description'] . ' - Started',
                            data: [
                                'type' => 'control_started',
                                'controlType' => $newType,
                                'device_id' => (string) $device->id,
                                'device_uid' => $device->device_id,
                                'screen' => '/(app)/(drawer)/device-status',
                            ],
                            userId: $device->user_id,
                            sound: 'default',
                        );
                        $this->pushNotificationService->sendToUser($notificationDto);
                        Log::info("Device {$device->id}: Control started notification sent successfully");
                        
                        // Log notification to history
                        $this->logNotificationToHistory(
                            $device,
                            $controlTitle,
                            $newControlStatus['description'] . ' - Started',
                            'control_started'
                        );
                    } catch (\Exception $e) {
                        Log::error("Device {$device->id}: Failed to send control started notification: " . $e->getMessage());
                        Log::error("Device {$device->id}: Notification error trace: " . $e->getTraceAsString());
                    }
                } else {
                    Log::warning("Device {$device->id}: Cannot send notification - device has no user_id");
                }
            }
            // Track when control completes (active -> idle) and send notification
            elseif ($previousType !== 'idle' && $newType === 'idle') {
                $controlTitle = $this->getControlTitle($previousType);
                $previousState = $previousControlStatus['state'] ?? '';
                $previousDescription = $previousControlStatus['description'] ?? '';
                
                // For pH control, check if we need to look at the last non-mixing state
                // Store the last non-mixing state for pH to determine up/down direction
                if ($previousType === 'ph' && !isset($settings['last_ph_state'])) {
                    $settings['last_ph_state'] = $previousState;
                }
                
                // Determine specific completion message based on control type and state
                $completionMessage = $this->getCompletionMessage($previousType, $previousState, $previousDescription, $settings);
                
                // Log to database
                $this->logControlEvent(
                    $device,
                    $previousType,
                    'completed',
                    $controlTitle,
                    $completionMessage
                );

                // Update last algae treatment date when algae control completes
                if ($previousType === 'algae') {
                    $settings['last_algae_treatment'] = now()->toIso8601String();
                }

                // Send push notification to device owner with specific message
                if ($device->user_id) {
                    try {
                        // For pH, use the stored last state if current state is mixing
                        $stateForTitle = $previousState;
                        if ($previousType === 'ph' && $previousState === 'mixing' && isset($settings['last_ph_state'])) {
                            $stateForTitle = $settings['last_ph_state'];
                        }
                        
                        $notificationTitle = $this->getCompletionTitle($previousType, $stateForTitle);
                        
                        $notificationDto = new NotificationDTO(
                            title: $notificationTitle,
                            body: $completionMessage,
                            data: [
                                'type' => 'control_completed',
                                'controlType' => $previousType,
                                'device_id' => (string) $device->id,
                                'device_uid' => $device->device_id,
                                'screen' => '/(app)/(drawer)/device-status',
                            ],
                            userId: $device->user_id,
                            sound: 'default',
                        );
                        $this->pushNotificationService->sendToUser($notificationDto);
                        Log::info("Device {$device->id}: Sent {$previousType} control completion notification");
                        
                        // Log notification to history
                        $this->logNotificationToHistory(
                            $device,
                            $notificationTitle,
                            $completionMessage,
                            'control_completed'
                        );
                        
                        // Clear stored pH state after notification
                        if ($previousType === 'ph' && isset($settings['last_ph_state'])) {
                            unset($settings['last_ph_state']);
                        }
                    } catch (\Exception $e) {
                        Log::error('Failed to send control completed notification: ' . $e->getMessage());
                    }
                }
            }
            // Track progress milestones (25%, 50%, 75%, 100%) and send notification
            elseif ($newType !== 'idle' && $newProgress > $previousProgress) {
                $milestones = [25, 50, 75, 100];
                foreach ($milestones as $milestone) {
                    if ($newProgress >= $milestone && $previousProgress < $milestone) {
                        $controlTitle = $this->getControlTitle($newType);
                        
                        // Log to database
                        $this->logControlEvent(
                            $device,
                            $newType,
                            'progress',
                            $controlTitle,
                            $newControlStatus['description'] . " - {$milestone}% complete",
                            $milestone
                        );

                        // Send push notification to device owner for progress milestones
                        if ($device->user_id) {
                            try {
                                $notificationDto = new NotificationDTO(
                                    title: $controlTitle,
                                    body: $newControlStatus['description'] . " - {$milestone}% complete",
                                    data: [
                                        'type' => 'control_progress',
                                        'controlType' => $newType,
                                        'progress' => (string) $milestone,
                                        'device_id' => (string) $device->id,
                                        'device_uid' => $device->device_id,
                                        'screen' => '/(app)/(drawer)/device-status',
                                    ],
                                    userId: $device->user_id,
                                    sound: 'default',
                                );
                                $this->pushNotificationService->sendToUser($notificationDto);
                                
                                // Log notification to history
                                $this->logNotificationToHistory(
                                    $device,
                                    $controlTitle,
                                    $newControlStatus['description'] . " - {$milestone}% complete",
                                    'control_progress'
                                );
                            } catch (\Exception $e) {
                                Log::error('Failed to send control progress notification: ' . $e->getMessage());
                            }
                        }
                        break; // Only track one milestone per update
                    }
                }
            }

            $settings['control_status'] = $newControlStatus;
        }

        // Optionally track if the device reports itself as active
        if (array_key_exists('isActive', $payload)) {
            $device->status = $payload['isActive'] ? 'active' : 'inactive';
        }

        $device->settings = $settings;

        $changedFields = [];
        
        // Include control_status in changedFields if it changed
        // Now includes elapsed time changes, so real-time updates work during stirring/mixing
        if ($controlStatusChanged && isset($settings['control_status'])) {
            $changedFields['control_status'] = $settings['control_status'];
        }

        if ($device->id) {
            if (isset($payload['phLevel']) && is_numeric($payload['phLevel'])) {
                $phValue = (float) $payload['phLevel'];
                $lastPh = PhLevel::where('smart_device_id', $device->id)->latest()->first();

                if (! $lastPh || (float) $lastPh->value !== $phValue) {
                    PhLevel::create([
                        'smart_device_id' => $device->id,
                        'value' => $phValue,
                    ]);
                }
            }

            if (isset($payload['ecLevel']) && is_numeric($payload['ecLevel'])) {
                $ecValue = (float) $payload['ecLevel'];
                $lastEc = ECLevel::where('smart_device_id', $device->id)->latest()->first();

                if (! $lastEc || (float) $lastEc->value !== $ecValue) {
                    ECLevel::create([
                        'smart_device_id' => $device->id,
                        'value' => $ecValue,
                    ]);
                }
            }

            if (isset($payload['doData']) && is_numeric($payload['doData'])) {
                $doValue = (float) $payload['doData'];
                $lastDo = DissolvedOxygen::where('smart_device_id', $device->id)->latest()->first();

                if (! $lastDo || (float) $lastDo->value !== $doValue) {
                    DissolvedOxygen::create([
                        'smart_device_id' => $device->id,
                        'value' => $doValue,
                    ]);
                }
            }

            if (isset($payload['temperature']) && is_numeric($payload['temperature'])) {
                $tempValue = (float) $payload['temperature'];
                $lastTemp = Temperature::where('smart_device_id', $device->id)->latest()->first();

                if (! $lastTemp || (float) $lastTemp->value !== $tempValue) {
                    Temperature::create([
                        'smart_device_id' => $device->id,
                        'value' => $tempValue,
                    ]);
                }
            }

            if (isset($payload['turbidity']) && is_numeric($payload['turbidity'])) {
                $turbValue = (float) $payload['turbidity'];
                $lastTurb = Turbidity::where('smart_device_id', $device->id)->latest()->first();

                if (! $lastTurb || (float) $lastTurb->value !== $turbValue) {
                    Turbidity::create([
                        'smart_device_id' => $device->id,
                        'value' => $turbValue,
                    ]);
                }
            }
        }

        foreach (['ph_level', 'do_data', 'ec_level', 'temperature', 'turbidity'] as $key) {
            $before = $previousTelemetry[$key] ?? null;
            $after = $currentTelemetry[$key] ?? null;

            if ($before !== $after) {
                $changedFields[$key] = $after;
            }
        }

        // ---- Supplies mapping ----
        if (! empty($payload['supplies']) && is_array($payload['supplies']) && $device->id) {
            $mapTypes = [
                'nutrient_a',
                'nutrient_b',
                'ph_up',
                'ph_down',
                'hydrogen_peroxide',
                'water_tank',
            ];

            foreach ($mapTypes as $type) {
                if (! array_key_exists($type, $payload['supplies'])) {
                    continue;
                }

                $rawStatus = $payload['supplies'][$type];
                // Accept multiple representations:
                // - Numeric: 1 = in_stock, 0 = need_refilled
                // - Boolean: true = in_stock, false = need_refilled
                // - String: 'in_stock' or 'need_refilled' (backwards compatible)
                if (is_numeric($rawStatus)) {
                    $status = (int) $rawStatus === 1 ? 'in_stock' : 'need_refilled';
                } elseif (is_bool($rawStatus)) {
                    $status = $rawStatus ? 'in_stock' : 'need_refilled';
                } elseif (is_string($rawStatus)) {
                    $status = $rawStatus === 'need_refilled' ? 'need_refilled' : 'in_stock';
                } else {
                    $status = 'in_stock';
                }

                $supply = Supply::firstOrCreate(
                    [
                        'smart_device_id' => $device->id,
                        'type' => $type,
                    ],
                    [
                        'display_name' => ucfirst(str_replace('_', ' ', $type)),
                        'status' => 'in_stock',
                    ],
                );

                if ($supply->status !== $status) {
                    $supply->status = $status;
                    $supply->save();

                    $changedFields['supplies'][$type] = $status;
                }
            }
        }

        // Refresh plant growth data if device has an active plant (ensures age is current)
        $this->refreshDevicePlantGrowth($device);

        $rulesResult = $this->rulesService->evaluate($device, $currentTelemetry);

        $settings['rules'] = $rulesResult;

        $currentAlertState = [];
        if (! empty($rulesResult['alerts']) && is_array($rulesResult['alerts'])) {
            foreach ($rulesResult['alerts'] as $alert) {
                if (! empty($alert['code']) && is_string($alert['code'])) {
                    $currentAlertState[$alert['code']] = true;
                }
            }
        }
        $settings['rules_alert_state'] = $currentAlertState;

        $device->settings = $settings;

        if (! empty($rulesResult['alerts']) && $device->user_id) {
            $primaryAlert = $rulesResult['alerts'][0];
            $severity = $primaryAlert['severity'] ?? 'info';
            $code = $primaryAlert['code'] ?? null;

            $wasActive = $code && ! empty($previousAlertState[$code]);

            if (! $wasActive) {
                if ($severity === 'critical') {
                    $title = 'System Alert (Critical)';
                } elseif ($severity === 'warning') {
                    $title = 'System Warning';
                } else {
                    $title = 'System Notice';
                }

                $body = $primaryAlert['message'] ?? 'Your LettuceGrow system has a new alert.';

                $data = [
                    'type' => 'alert',
                    'source' => 'lettucegrow_rules',
                    'severity' => $severity,
                    'alerts' => $rulesResult['alerts'],
                    'automations' => $rulesResult['automations'] ?? null,
                    'safety' => $rulesResult['safety'] ?? null,
                    'device_id' => $device->id,
                    'device_uid' => $device->device_id,
                    'screen' => '/(app)/(drawer)/(tabs)/alerts',
                ];

                $notificationDto = new NotificationDTO(
                    title: $title,
                    body: $body,
                    data: $data,
                    userId: $device->user_id,
                    tokens: null,
                );

                try {
                    Log::info("Device {$device->id}: Sending alert notification - {$code} ({$severity})");
                    $this->pushNotificationService->sendToUser($notificationDto);
                    Log::info("Device {$device->id}: Alert notification sent successfully");
                    
                    // Log notification to history
                    $this->logNotificationToHistory(
                        $device,
                        $title,
                        $body,
                        'alert'
                    );
                } catch (\Throwable $e) {
                    Log::error("Device {$device->id}: Failed to send LettuceGrow rules notification: " . $e->getMessage());
                    Log::error("Device {$device->id}: Notification error trace: " . $e->getTraceAsString());
                }
            }
        }

        // Don't save yet - we'll save after auto-trigger logic runs
        // $device->save();

        if (! empty($changedFields)) {
            DeviceDataUpdated::dispatch($device, $changedFields);
        }

        // Fetch sensor evaluation for thresholds and timing constants
        $evaluation = SensorDataEvaluation::where('smart_device_id', $device->id)->first();

        // Get growth stage-based thresholds if no custom values are set
        $growthStageData = $this->getGrowthStageThresholds($device);
        $growthStageThresholds = $growthStageData['thresholds'];
        $hasGrowthStageThresholds = $growthStageData['found'];
        $growthStage = $growthStageData['growth_stage'];
        
        // Dosing configuration - concentration rates (mL/L) and water volume (L)
        // Pump flow rate: 80 mL/min for dosing pumps
        // Time calculation: Time(ms) = (Concentration × WaterVolume / 80) × 60 × 1000
        $defaultWaterVolume = 6.0; // Liters
        $pumpFlowRate = 80.0; // mL/min
        
        // Concentration rates (mL/L) based on growth stage
        $nutrientConcentration = $growthStage === 'vegetative' 
            ? 5.0  // Vegetative: 5.0 mL/L
            : 2.5; // Seedling: 2.5 mL/L (default)
        $h2o2Concentration = 0.46; // mL/L for preventive treatment
        
        // pH dose is direct volume (mL), NOT concentration
        $phDoseVolumeMl = 2.0; // 2.0 mL default dose
        
        // Calculate time in milliseconds from concentration
        // Formula: Time(ms) = (Concentration × WaterVolume / PumpFlowRate) × 60 × 1000
        $calcTimeMs = fn($concentration, $waterVolume = null) => 
            (int) round((($concentration * ($waterVolume ?? $defaultWaterVolume)) / $pumpFlowRate) * 60 * 1000);
        
        // Calculate water pump time (6 L/min flow rate)
        // Time(s) = WaterVolume(L) / FlowRate(L/min) × 60
        $waterPumpFlowRate = 6.0; // L/min
        $waterTimeMs = (int) round(($defaultWaterVolume / $waterPumpFlowRate) * 60 * 1000); // 6L / 6L/min = 1min = 60s = 60000ms
        
        // Default values from Types.h files (fallback if no growth stage)
        $defaults = [
            'sensor_thresholds' => [
                'ph' => ['min' => 5.5, 'max' => 6.5],
                'ec' => ['min' => 1.5, 'max' => 2.5],
                'temperature' => ['min' => 20.0, 'max' => 24.0],
                'dissolved_o2' => ['min' => 5.0],
                'turbidity' => ['min' => null, 'max' => 2.0],
            ],
            'timing_constants' => [
                'ph' => [
                    // pH dose: direct volume (mL), NOT concentration
                    // 2.0 mL / 80 mL/min × 60 × 1000 = 1500ms (1.5 seconds)
                    'dose_time' => (int) round(($phDoseVolumeMl / $pumpFlowRate) * 60 * 1000),
                    'retry_time' => 300000,     // 300 seconds (5 minutes) in ms
                    'check_interval' => 5000,   // 5 seconds in ms
                ],
                'ec' => [
                    // Nutrient A: 2.5 mL/L × 6L = 15mL → (15/80)×60×1000 = 11250ms (seedling)
                    // Nutrient A: 5.0 mL/L × 6L = 30mL → (30/80)×60×1000 = 22500ms (vegetative)
                    'nutrient_a_time' => $calcTimeMs($nutrientConcentration),
                    'stir_after_a_time' => 60000,    // 60 seconds in ms
                    'nutrient_b_time' => $calcTimeMs($nutrientConcentration),
                    // Water pump: 6L × 60s × 1000 = 360000ms
                    'clean_water_time' => $waterTimeMs,
                    'retry_time' => 300000,          // 300 seconds (5 minutes) in ms
                    'check_interval' => 5000,        // 5 seconds in ms
                ],
                'algae' => [
                    // H2O2: 0.46 mL/L × 6L = 2.76mL → (2.76/80)×60×1000 = 2070ms
                    'h2o2_dose_time' => $calcTimeMs($h2o2Concentration),
                    'mixing_time' => 120000,         // 120 seconds (2 minutes) in ms
                    'clean_water_time' => $waterTimeMs,
                ],
            ],
        ];

        // Build sensor thresholds (use custom values if available, otherwise growth stage-based, otherwise defaults)
        $sensorThresholds = [
            'ph' => [
                'min' => $evaluation && $evaluation->min_ph !== null 
                    ? (float) $evaluation->min_ph 
                    : ($hasGrowthStageThresholds && $growthStageThresholds['ph']['min'] !== null 
                        ? $growthStageThresholds['ph']['min'] 
                        : $defaults['sensor_thresholds']['ph']['min']),
                'max' => $evaluation && $evaluation->max_ph !== null 
                    ? (float) $evaluation->max_ph 
                    : ($hasGrowthStageThresholds && $growthStageThresholds['ph']['max'] !== null 
                        ? $growthStageThresholds['ph']['max'] 
                        : $defaults['sensor_thresholds']['ph']['max']),
            ],
            'ec' => [
                'min' => $evaluation && $evaluation->min_ec !== null 
                    ? (float) $evaluation->min_ec 
                    : ($hasGrowthStageThresholds && $growthStageThresholds['ec']['min'] !== null 
                        ? $growthStageThresholds['ec']['min'] 
                        : $defaults['sensor_thresholds']['ec']['min']),
                'max' => $evaluation && $evaluation->max_ec !== null 
                    ? (float) $evaluation->max_ec 
                    : ($hasGrowthStageThresholds && $growthStageThresholds['ec']['max'] !== null 
                        ? $growthStageThresholds['ec']['max'] 
                        : $defaults['sensor_thresholds']['ec']['max']),
            ],
            'temperature' => [
                'min' => $evaluation && $evaluation->min_temp !== null ? (float) $evaluation->min_temp : $defaults['sensor_thresholds']['temperature']['min'],
                'max' => $evaluation && $evaluation->max_temp !== null ? (float) $evaluation->max_temp : $defaults['sensor_thresholds']['temperature']['max'],
            ],
            'dissolved_o2' => [
                'min' => $evaluation && $evaluation->min_dissolved_o2 !== null ? (float) $evaluation->min_dissolved_o2 : $defaults['sensor_thresholds']['dissolved_o2']['min'],
            ],
            'turbidity' => [
                'min' => $evaluation && $evaluation->min_turbidity !== null ? (float) $evaluation->min_turbidity : $defaults['sensor_thresholds']['turbidity']['min'],
                'max' => $evaluation && $evaluation->max_turbidity !== null ? (float) $evaluation->max_turbidity : $defaults['sensor_thresholds']['turbidity']['max'],
            ],
        ];

        // Build timing constants (use custom values if available, otherwise defaults)
        // Note: Values in database are stored in milliseconds, so use them directly
        $timingConstants = [
            'ph' => [
                'dose_time' => $evaluation && $evaluation->ph_dose_time !== null ? (int) $evaluation->ph_dose_time : $defaults['timing_constants']['ph']['dose_time'],
                'retry_time' => $evaluation && $evaluation->ph_retry_time !== null ? (int) $evaluation->ph_retry_time : $defaults['timing_constants']['ph']['retry_time'],
                'check_interval' => $evaluation && $evaluation->ph_check_interval !== null ? (int) $evaluation->ph_check_interval : $defaults['timing_constants']['ph']['check_interval'],
            ],
            'ec' => [
                'nutrient_a_time' => $evaluation && $evaluation->ec_nutrient_a_time !== null ? (int) $evaluation->ec_nutrient_a_time : $defaults['timing_constants']['ec']['nutrient_a_time'],
                'stir_after_a_time' => $evaluation && $evaluation->ec_stir_after_a_time !== null ? (int) $evaluation->ec_stir_after_a_time : $defaults['timing_constants']['ec']['stir_after_a_time'],
                'nutrient_b_time' => $evaluation && $evaluation->ec_nutrient_b_time !== null ? (int) $evaluation->ec_nutrient_b_time : $defaults['timing_constants']['ec']['nutrient_b_time'],
                'clean_water_time' => $evaluation && $evaluation->ec_clean_water_time !== null ? (int) $evaluation->ec_clean_water_time : $defaults['timing_constants']['ec']['clean_water_time'],
                'retry_time' => $evaluation && $evaluation->ec_retry_time !== null ? (int) $evaluation->ec_retry_time : $defaults['timing_constants']['ec']['retry_time'],
                'check_interval' => $evaluation && $evaluation->ec_check_interval !== null ? (int) $evaluation->ec_check_interval : $defaults['timing_constants']['ec']['check_interval'],
            ],
            'algae' => [
                'h2o2_dose_time' => $evaluation && $evaluation->algae_h2o2_dose_time !== null ? (int) $evaluation->algae_h2o2_dose_time : $defaults['timing_constants']['algae']['h2o2_dose_time'],
                'mixing_time' => $evaluation && $evaluation->algae_mixing_time !== null ? (int) $evaluation->algae_mixing_time : $defaults['timing_constants']['algae']['mixing_time'],
                'clean_water_time' => $evaluation && $evaluation->algae_clean_water_time !== null ? (int) $evaluation->algae_clean_water_time : $defaults['timing_constants']['algae']['clean_water_time'],
            ],
        ];

        // Check for automatic 7-day algae control trigger
        $controls = $settings['controls'] ?? [];
        $currentControlStatus = $settings['control_status'] ?? null;
        $currentControlType = $currentControlStatus['type'] ?? 'idle';
        
        // Initialize auto-trigger command object
        $autoTriggerCommand = null;
        
        Log::info("Checking auto-trigger for device {$device->id}: currentControlType={$currentControlType}");
        
        // Only trigger if not already in algae control
        if ($currentControlType !== 'algae') {
            $lastAlgaeTreatment = $settings['last_algae_treatment'] ?? null;
            $shouldTriggerAlgaeControl = false;
            $daysSinceTreatment = null;
            $daysSinceCreation = null;
            
            // Calculate device age
            $daysSinceCreation = $device->created_at ? now()->diffInDays($device->created_at) : 0;
            
            if ($lastAlgaeTreatment) {
                try {
                    $lastTreatmentDate = Carbon::parse($lastAlgaeTreatment);
                    $daysSinceTreatment = now()->diffInDays($lastTreatmentDate);
                    
                    Log::info("Device {$device->id}: Last treatment was {$daysSinceTreatment} days ago (device age: {$daysSinceCreation} days)");
                    
                    // Trigger if 7 or more days have passed
                    if ($daysSinceTreatment >= 7) {
                        $shouldTriggerAlgaeControl = true;
                        Log::info("Device {$device->id}: ✓ Should trigger - {$daysSinceTreatment} days >= 7 days");
                    } else {
                        Log::info("Device {$device->id}: ✗ Not triggering - only {$daysSinceTreatment} days since last treatment (need 7)");
                    }
                } catch (\Exception $e) {
                    Log::error('Error parsing last algae treatment date: ' . $e->getMessage());
                    // If date is invalid, trigger after 7 days from device creation
                    Log::info("Device {$device->id}: Invalid treatment date, checking device age: {$daysSinceCreation} days");
                    if ($daysSinceCreation >= 7) {
                        $shouldTriggerAlgaeControl = true;
                        Log::info("Device {$device->id}: ✓ Should trigger - device age {$daysSinceCreation} days >= 7 days");
                    } else {
                        Log::info("Device {$device->id}: ✗ Not triggering - device only {$daysSinceCreation} days old (need 7)");
                    }
                }
            } else {
                // No previous treatment recorded, check device age
                Log::info("Device {$device->id}: No previous treatment, device age: {$daysSinceCreation} days");
                if ($daysSinceCreation >= 7) {
                    $shouldTriggerAlgaeControl = true;
                    Log::info("Device {$device->id}: ✓ Should trigger - device age {$daysSinceCreation} days >= 7 days");
                } else {
                    Log::info("Device {$device->id}: ✗ Not triggering - device only {$daysSinceCreation} days old (need 7)");
                }
            }
            
            // Automatically trigger algae control
            if ($shouldTriggerAlgaeControl) {
                Log::info("Device {$device->id}: AUTO-TRIGGERING algae control");
                
                // Check if ESP32 has acknowledged the trigger or if algae control is already active
                $autoTriggerAcknowledged = $settings['auto_trigger_acknowledged'] ?? null;
                $isAcknowledged = false;
                
                if ($autoTriggerAcknowledged) {
                    try {
                        $acknowledgedDate = Carbon::parse($autoTriggerAcknowledged);
                        // If acknowledged within last 24 hours, consider it still processing
                        if (now()->diffInHours($acknowledgedDate) < 24) {
                            $isAcknowledged = true;
                            Log::info("Device {$device->id}: Auto-trigger already acknowledged within last 24 hours");
                        }
                    } catch (\Exception $e) {
                        Log::error('Error parsing auto trigger acknowledged date: ' . $e->getMessage());
                    }
                }
                
                // Send trigger if:
                // 1. Not acknowledged yet, OR
                // 2. Control status doesn't show algae is active (ESP32 might have missed it)
                // This ensures we keep sending until ESP32 actually starts the control
                $shouldSendTrigger = !$isAcknowledged;
                
                if ($shouldSendTrigger) {
                    // Create auto-trigger command object
                    $autoTriggerCommand = [
                        'type' => 'algae_control',
                        'action' => 'start',
                        'reason' => 'scheduled_maintenance',
                        'days_since_last_treatment' => $daysSinceTreatment,
                        'days_since_creation' => $daysSinceCreation,
                        'timestamp' => now()->toIso8601String(),
                    ];
                    
                    // Mark that auto-trigger command was sent (for tracking)
                    if (!isset($settings['auto_trigger_sent'])) {
                        $settings['auto_trigger_sent'] = now()->toIso8601String();
                        
                        // Send notification to user (only once when first triggered)
                        if ($device->user_id) {
                            try {
                                $notificationDto = new NotificationDTO(
                                    title: 'Automatic Algae Treatment',
                                    body: '7 days have passed since last treatment. Algae control has been automatically triggered.',
                                    data: [
                                        'type' => 'auto_algae_trigger',
                                        'device_id' => (string) $device->id,
                                        'device_uid' => $device->device_id,
                                        'screen' => '/(app)/(drawer)/device-status',
                                    ],
                                    userId: $device->user_id,
                                    sound: 'default',
                                );
                                $this->pushNotificationService->sendToUser($notificationDto);
                                Log::info("Device {$device->id}: Sent auto-trigger notification to user");
                                
                                // Log notification to history
                                $this->logNotificationToHistory(
                                    $device,
                                    'Automatic Algae Treatment',
                                    '7 days have passed since last treatment. Algae control has been automatically triggered.',
                                    'auto_algae_trigger'
                                );
                            } catch (\Exception $e) {
                                Log::error('Failed to send auto algae trigger notification: ' . $e->getMessage());
                            }
                        }
                    }
                    
                    Log::info("Device {$device->id}: Sending auto-trigger command to ESP32 (overdue: {$daysSinceTreatment} days)");
                } else {
                    // ESP32 has acknowledged, don't send trigger again
                    $autoTriggerCommand = null;
                    Log::info("Device {$device->id}: Auto-trigger acknowledged, waiting for completion");
                }
            } else {
                Log::info("Device {$device->id}: Not triggering - conditions not met (daysSinceTreatment={$daysSinceTreatment}, daysSinceCreation={$daysSinceCreation})");
            }
        } else {
            Log::info("Device {$device->id}: Skipping auto-trigger - already in algae control");
        }
        
        // Store sensor thresholds in device settings for frontend access
        $settings['sensor_thresholds'] = $sensorThresholds;
        
        // Store sensor thresholds in device settings for frontend access
        $settings['sensor_thresholds'] = $sensorThresholds;
        
        // Ensure device settings are saved with all updates
        $device->settings = $settings;
        
        // Save device with all updates
        $device->save();
        
        Log::info("Device settings saved for device {$device->id}. Controls: " . json_encode($controls));
        
        // Build response without rules and telemetry
        $responseSettings = [
            'controls' => $controls,
        ];
        
        // Add algae_control trigger flag if auto-trigger command is present
        if ($autoTriggerCommand !== null) {
            $responseSettings['algae_control'] = true;
            $responseSettings['auto_trigger'] = $autoTriggerCommand;
        } else {
            $responseSettings['algae_control'] = false;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'device_id' => $device->device_id,
                'wifi_reset' => $resetRequested,
                'device_settings' => $responseSettings,
                'sensor_thresholds' => $sensorThresholds,
                'timing_constants' => $timingConstants,
            ],
        ]);
    }

    /**
     * Log notification to control history
     */
    private function logNotificationToHistory(SmartDevice $device, string $title, string $message, string $notificationType = 'alert'): void
    {
        ControlHistory::create([
            'smart_device_id' => $device->id,
            'type' => 'notification',
            'event' => 'sent',
            'title' => $title,
            'description' => $message,
            'notification_type' => $notificationType,
            'timestamp' => now(),
        ]);
    }

    /**
     * Log control event to control history
     */
    private function logControlEvent(SmartDevice $device, string $type, string $event, string $title, string $description, ?int $progress = null): void
    {
        ControlHistory::create([
            'smart_device_id' => $device->id,
            'type' => $type,
            'event' => $event,
            'title' => $title,
            'description' => $description,
            'progress' => $progress,
            'timestamp' => now(),
        ]);
    }

    /**
     * Get control title for history tracking.
     */
    private function getControlTitle(string $type): string
    {
        return match ($type) {
            'algae' => 'Algae Treatment',
            'ph' => 'pH Adjustment',
            'ec' => 'EC/Nutrient Adjustment',
            'water_refill' => 'Water Reservoir Refill',
            default => 'System Control',
        };
    }

    /**
     * Get completion message based on control type and state.
     */
    private function getCompletionMessage(string $type, string $state, string $description, array $settings = []): string
    {
        return match ($type) {
            'ph' => $this->getPHCompletionMessage($state, $description, $settings),
            'ec' => 'EC/Nutrient levels have been optimized successfully.',
            'algae' => 'Algae treatment completed successfully. System is clean and ready.',
            'water_refill' => 'Water reservoir has been refilled successfully.',
            default => 'Control operation completed successfully',
        };
    }

    /**
     * Get pH-specific completion message.
     */
    private function getPHCompletionMessage(string $state, string $description, array $settings = []): string
    {
        // Check if it's pH up or pH down based on state or description
        // ESP32 states: "adding_up", "adding_down", "mixing", "idle"
        $stateLower = strtolower($state);
        $descLower = strtolower($description);
        
        // If state is mixing, check the stored last_ph_state
        if ($stateLower === 'mixing' && isset($settings['last_ph_state'])) {
            $stateLower = strtolower($settings['last_ph_state']);
        }
        
        if (str_contains($stateLower, 'adding_up') || str_contains($stateLower, 'ph_up') || 
            str_contains($descLower, 'ph up') || str_contains($descLower, 'increasing') ||
            str_contains($descLower, 'potassium hydroxide')) {
            return 'pH levels have been optimized (increased) successfully.';
        } elseif (str_contains($stateLower, 'adding_down') || str_contains($stateLower, 'ph_down') || 
                   str_contains($descLower, 'ph down') || str_contains($descLower, 'decreasing') ||
                   str_contains($descLower, 'phosphoric acid')) {
            return 'pH levels have been optimized (decreased) successfully.';
        }
        
        return 'pH levels have been optimized successfully.';
    }

    /**
     * Get completion notification title.
     */
    private function getCompletionTitle(string $type, string $state): string
    {
        return match ($type) {
            'ph' => $this->getPHCompletionTitle($state),
            'ec' => 'EC Optimization Complete',
            'algae' => 'Algae Cleaning Complete',
            default => 'Control Complete',
        };
    }

    /**
     * Get pH-specific completion title.
     */
    private function getPHCompletionTitle(string $state): string
    {
        // ESP32 states: "adding_up", "adding_down", "mixing", "idle"
        $stateLower = strtolower($state);
        
        if (str_contains($stateLower, 'adding_up') || str_contains($stateLower, 'ph_up')) {
            return 'pH Optimization Complete (Up)';
        } elseif (str_contains($stateLower, 'adding_down') || str_contains($stateLower, 'ph_down')) {
            return 'pH Optimization Complete (Down)';
        }
        
        return 'pH Optimization Complete';
    }

    /**
     * Get growth stage-based sensor thresholds for pH and EC.
     * Returns thresholds based on active plant's growth stage if available.
     * Returns array with 'thresholds' and 'found' flag.
     */
    private function getGrowthStageThresholds(SmartDevice $device): array
    {
        $result = [
            'thresholds' => [
                'ph' => ['min' => null, 'max' => null],
                'ec' => ['min' => null, 'max' => null],
            ],
            'found' => false,
            'growth_stage' => null, // Added to return the growth stage
        ];

        if (!$device->id) {
            Log::info("Device {$device->device_id}: Cannot get growth stage thresholds - no device ID");
            return $result;
        }
        
        Log::info("Device {$device->id} (device_id: '{$device->device_id}'): Starting growth stage threshold lookup");

        // Try to get active plant using the active() scope
        $activePlant = Plant::where('device_id', $device->id)
            ->active()
            ->orderByDesc('planting_date')
            ->first();

        // If not found, try alternative query
        if (!$activePlant) {
            Log::info("Device {$device->id}: Active scope didn't find plant, trying direct query");
            $activePlant = Plant::where('device_id', $device->id)
                ->whereNot('status', Plant::STATUS_RETIRED)
                ->orderByDesc('planting_date')
                ->first();
        }

        // Debug: Check all plants for this device if still not found
        if (!$activePlant) {
            $allPlants = Plant::where('device_id', $device->id)->get();
            Log::info("Device {$device->id}: No active plant found. Total plants: " . $allPlants->count());
            if ($allPlants->count() > 0) {
                foreach ($allPlants as $p) {
                    Log::info("Device {$device->id}: Plant ID {$p->id} - device_id: {$p->device_id}, Status: '{$p->status}', Planting Date: {$p->planting_date}, Age: {$p->plant_age_days} days, Growth Stage: " . ($p->growth_stage ?? 'null'));
                }
            } else {
                // Check if there are any plants at all in the database
                $totalPlants = Plant::count();
                Log::info("Device {$device->id}: No plants found for this device. Total plants in database: {$totalPlants}");
            }
            
            // Fallback: Try to get growth stage from device's plant_growth data
            $plantGrowth = $device->plant_growth;
            Log::info("Device {$device->id}: Checking device plant_growth data: " . json_encode($plantGrowth));
            if (is_array($plantGrowth) && isset($plantGrowth['plant_id'])) {
                Log::info("Device {$device->id}: Attempting to load plant from plant_growth data - Plant ID: {$plantGrowth['plant_id']}");
                $activePlant = Plant::find($plantGrowth['plant_id']);
                if ($activePlant && $activePlant->status !== Plant::STATUS_RETIRED) {
                    Log::info("Device {$device->id}: Found plant from plant_growth data - Status: '{$activePlant->status}'");
                } else {
                    $activePlant = null;
                    Log::info("Device {$device->id}: Plant from plant_growth data not found or is retired");
                }
            }
        }

        if (!$activePlant) {
            Log::info("Device {$device->id}: No active plant found for growth stage thresholds");
            return $result;
        }

        // Get growth stage from plant (accessor should work)
        $growthStage = $activePlant->growth_stage;
        Log::info("Device {$device->id}: Active plant found - ID: {$activePlant->id}, Age: {$activePlant->plant_age_days} days, Growth Stage: " . ($growthStage ?? 'null'));
        
        // Set the growth stage in result
        $result['growth_stage'] = $growthStage;
        
        if (!$growthStage) {
            Log::info("Device {$device->id}: Plant has no growth stage (age: {$activePlant->plant_age_days} days)");
            return $result;
        }

        // Get growth stage configuration
        $config = config('lettucegrow_rules.growth_stages', []);
        $stageConfig = $config[$growthStage] ?? null;

        if ($stageConfig) {
            $found = false;
            if (isset($stageConfig['ph']) && isset($stageConfig['ph']['min']) && isset($stageConfig['ph']['max'])) {
                $result['thresholds']['ph'] = [
                    'min' => (float) $stageConfig['ph']['min'],
                    'max' => (float) $stageConfig['ph']['max'],
                ];
                $found = true;
                Log::info("Device {$device->id}: Using growth stage '{$growthStage}' pH thresholds: {$result['thresholds']['ph']['min']}-{$result['thresholds']['ph']['max']}");
            }
            if (isset($stageConfig['ec']) && isset($stageConfig['ec']['min']) && isset($stageConfig['ec']['max'])) {
                $result['thresholds']['ec'] = [
                    'min' => (float) $stageConfig['ec']['min'],
                    'max' => (float) $stageConfig['ec']['max'],
                ];
                $found = true;
                Log::info("Device {$device->id}: Using growth stage '{$growthStage}' EC thresholds: {$result['thresholds']['ec']['min']}-{$result['thresholds']['ec']['max']}");
            }
            $result['found'] = $found;
        } else {
            Log::warning("Device {$device->id}: Growth stage '{$growthStage}' not found in config");
        }

        return $result;
    }

    /**
     * Refresh device's plant_growth data from the most recent active plant.
     * This ensures plant age is always current when ESP32 polls.
     */
    private function refreshDevicePlantGrowth(SmartDevice $device): void
    {
        if (!$device->id) {
            return;
        }

        // Get the most recent active plant for this device
        $activePlant = Plant::where('device_id', $device->id)
            ->whereNot('status', Plant::STATUS_RETIRED)
            ->orderByDesc('planting_date')
            ->first();
            
        // Log for debugging
        if (!$activePlant) {
            Log::info("Device {$device->id}: refreshDevicePlantGrowth - No active plant found");
        } else {
            Log::info("Device {$device->id}: refreshDevicePlantGrowth - Found active plant ID {$activePlant->id}, Status: {$activePlant->status}");
        }

        if ($activePlant) {
            // Recalculate plant age from planting_date to ensure accuracy
            $plantingDate = Carbon::parse($activePlant->planting_date);
            $currentAgeDays = (int) Carbon::today()->diffInDays($plantingDate);
            
            // Update plant_growth if age has changed or if it doesn't exist
            $needsUpdate = false;
            $plantGrowth = $device->plant_growth;
            
            if (!is_array($plantGrowth) || 
                ($plantGrowth['plant_id'] ?? null) !== $activePlant->id ||
                ($plantGrowth['plant_age_days'] ?? null) !== $currentAgeDays) {
                $needsUpdate = true;
            }
            
            if ($needsUpdate) {
                $device->plant_growth = [
                    'plant_type' => $activePlant->plant_type,
                    'system_type' => $activePlant->system_type,
                    'planting_date' => $activePlant->planting_date->toDateString(),
                    'plant_age_days' => $currentAgeDays,
                    'plant_id' => $activePlant->id,
                    'harvest_count' => $activePlant->harvest_count,
                ];
                $device->save();
            }
        } elseif ($device->plant_growth !== null) {
            // No active plants, clear plant_growth
            $device->plant_growth = null;
            $device->save();
        }
    }
}
