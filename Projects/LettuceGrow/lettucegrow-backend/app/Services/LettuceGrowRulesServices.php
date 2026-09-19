<?php

namespace App\Services;

use App\Models\SmartDevice;
use App\Models\Supply;
use App\Models\SensorDataEvaluation;
use Carbon\Carbon;

class LettuceGrowRulesServices
{
    /**
     * Evaluate current telemetry against configured rules and supply status.
     *
     * Returns a structured array that can be stored on the device settings
     * and used by the ESP32 + mobile app for alerts and automation decisions.
     */
    public function evaluate(SmartDevice $device, array $telemetry): array
    {
        $config = config('lettucegrow_rules', []);

        $growthStages = $config['growth_stages'] ?? [];
        $environment = $config['environment'] ?? [];
        $dosing = $config['dosing'] ?? [];
        $biosecurity = $config['biosecurity'] ?? [];

        $overrides = null;
        if ($device->id) {
            $overrides = SensorDataEvaluation::where('smart_device_id', $device->id)->first();
        }

        $plantAgeDays = $this->resolvePlantAgeDays($device);
        $stageKey = $this->resolveGrowthStage($plantAgeDays, $growthStages);

        $alerts = [];
        $automations = [];

        $ph = $this->toFloat($telemetry['ph_level'] ?? null);
        $ec = $this->toFloat($telemetry['ec_level'] ?? null);
        $temp = $this->toFloat($telemetry['temperature'] ?? null);
        $turbidity = $this->toFloat($telemetry['turbidity'] ?? null);
        $do = $this->toFloat($telemetry['do_data'] ?? null);

        // --- Growth stage based EC / pH checks ---
        if ($stageKey && isset($growthStages[$stageKey])) {
            $stageCfg = $growthStages[$stageKey];

            if (isset($stageCfg['ph']) && $ph !== null) {
                $minPhConfig = $stageCfg['ph']['min'] ?? null;
                $maxPhConfig = $stageCfg['ph']['max'] ?? null;

                $minPh = $overrides && $overrides->min_ph !== null
                    ? (float) $overrides->min_ph
                    : $minPhConfig;
                $maxPh = $overrides && $overrides->max_ph !== null
                    ? (float) $overrides->max_ph
                    : $maxPhConfig;

                if ($minPh !== null && $ph < $minPh) {
                    $alerts[] = [
                        'code' => 'ph_low_' . $stageKey,
                        'severity' => 'warning',
                        'message' => sprintf(
                            'pH (%.2f) is below optimal range for %s stage (%.2f–%.2f).',
                            $ph,
                            $stageKey,
                            $minPh,
                            $maxPh ?? $minPh
                        ),
                        'category' => 'ph',
                        'context' => [
                            'value' => $ph,
                            'min' => $minPh,
                            'max' => $maxPh,
                        ],
                    ];

                    // Suggest pH up dosing automation
                    $automations[] = [
                        'type' => 'dose_ph_up',
                        'label' => 'pH Up Dose',
                        'control_key' => 'ph_up',
                        'required_supplies' => ['ph_up'],
                        'dose_seconds' => $dosing['ph_control']['dose_time_sec'] ?? null,
                        'reason' => 'pH below minimum threshold',
                    ];
                } elseif ($maxPh !== null && $ph > $maxPh) {
                    $alerts[] = [
                        'code' => 'ph_high_' . $stageKey,
                        'severity' => 'warning',
                        'message' => sprintf(
                            'pH (%.2f) is above optimal range for %s stage (%.2f–%.2f).',
                            $ph,
                            $stageKey,
                            $minPh ?? $maxPh,
                            $maxPh
                        ),
                        'category' => 'ph',
                        'context' => [
                            'value' => $ph,
                            'min' => $minPh,
                            'max' => $maxPh,
                        ],
                    ];

                    // Suggest pH down dosing automation
                    $automations[] = [
                        'type' => 'dose_ph_down',
                        'label' => 'pH Down Dose',
                        'control_key' => 'ph_down',
                        'required_supplies' => ['ph_down'],
                        'dose_seconds' => $dosing['ph_control']['dose_time_sec'] ?? null,
                        'reason' => 'pH above maximum threshold',
                    ];
                }
            }

            if (isset($stageCfg['ec']) && $ec !== null) {
                $minEcConfig = $stageCfg['ec']['min'] ?? null;
                $maxEcConfig = $stageCfg['ec']['max'] ?? null;

                $minEc = $overrides && $overrides->min_ec !== null
                    ? (float) $overrides->min_ec
                    : $minEcConfig;
                $maxEc = $overrides && $overrides->max_ec !== null
                    ? (float) $overrides->max_ec
                    : $maxEcConfig;

                if ($minEc !== null && $ec < $minEc) {
                    $alerts[] = [
                        'code' => 'ec_low_' . $stageKey,
                        'severity' => 'warning',
                        'message' => sprintf(
                            'EC (%.2f) is below optimal range for %s stage (%.2f–%.2f).',
                            $ec,
                            $stageKey,
                            $minEc,
                            $maxEc ?? $minEc
                        ),
                        'category' => 'ec',
                        'context' => [
                            'value' => $ec,
                            'min' => $minEc,
                            'max' => $maxEc,
                        ],
                    ];

                    // Suggest nutrient A+B dosing automation
                    $automations[] = [
                        'type' => 'dose_nutrients',
                        'label' => 'Nutrient A+B Dose',
                        'control_key' => 'nutrient_mix',
                        'required_supplies' => ['nutrient_a', 'nutrient_b'],
                        'dose_seconds' => [
                            'nutrient_a' => $dosing['ec_control']['nutrient_a_dose_time_sec'] ?? null,
                            'nutrient_b' => $dosing['ec_control']['nutrient_b_dose_time_sec'] ?? null,
                        ],
                        'reason' => 'EC below minimum threshold',
                    ];
                } elseif ($maxEc !== null && $ec > $maxEc) {
                    $alerts[] = [
                        'code' => 'ec_high_' . $stageKey,
                        'severity' => 'warning',
                        'message' => sprintf(
                            'EC (%.2f) is above optimal range for %s stage (%.2f–%.2f). Consider dilution or partial flush.',
                            $ec,
                            $stageKey,
                            $minEc ?? $maxEc,
                            $maxEc
                        ),
                        'category' => 'ec',
                        'context' => [
                            'value' => $ec,
                            'min' => $minEc,
                            'max' => $maxEc,
                        ],
                    ];
                }
            }
        }

        // --- Environmental algae / DO / temperature checks ---
        if (! empty($environment['turbidity']) && $turbidity !== null) {
            $tCfg = $environment['turbidity'];
            $criticalMaxConfig = $tCfg['critical_max'] ?? null;

            $criticalMax = $overrides && $overrides->max_turbidity !== null
                ? (float) $overrides->max_turbidity
                : $criticalMaxConfig;

            if ($criticalMax !== null && $turbidity > $criticalMax) {
                $alerts[] = [
                    'code' => 'turbidity_high',
                    'severity' => 'warning',
                    'message' => sprintf(
                        'Water turbidity (%.2f NTU) is above critical level (%.2f NTU). Possible algae or biofilm.',
                        $turbidity,
                        $criticalMax
                    ),
                    'category' => 'environment',
                    'context' => [
                        'value' => $turbidity,
                        'critical_max' => $criticalMax,
                    ],
                ];
            }
        }

        if (! empty($environment['water_temp']) && $temp !== null) {
            $wCfg = $environment['water_temp'];
            $criticalMaxConfig = $wCfg['critical_max'] ?? null;

            $criticalMax = $overrides && $overrides->max_temp !== null
                ? (float) $overrides->max_temp
                : $criticalMaxConfig;
            $criticalMin = $overrides && $overrides->min_temp !== null
                ? (float) $overrides->min_temp
                : null;

            if ($criticalMax !== null && $temp > $criticalMax) {
                $alerts[] = [
                    'code' => 'water_temp_high',
                    'severity' => 'warning',
                    'message' => sprintf(
                        'Water temperature (%.2f°C) is above critical level (%.2f°C). High algae risk.',
                        $temp,
                        $criticalMax
                    ),
                    'category' => 'environment',
                    'context' => [
                        'value' => $temp,
                        'critical_max' => $criticalMax,
                    ],
                ];
            }

            if ($criticalMin !== null && $temp < $criticalMin) {
                $alerts[] = [
                    'code' => 'water_temp_low_custom',
                    'severity' => 'warning',
                    'message' => sprintf(
                        'Water temperature (%.2f°C) is below minimum threshold (%.2f°C).',
                        $temp,
                        $criticalMin
                    ),
                    'category' => 'environment',
                    'context' => [
                        'value' => $temp,
                        'critical_min' => $criticalMin,
                    ],
                ];
            }
        }

        if (! empty($environment['dissolved_oxygen']) && $do !== null) {
            $dCfg = $environment['dissolved_oxygen'];
            $criticalMinConfig = $dCfg['critical_min'] ?? null;

            $criticalMin = $overrides && $overrides->min_dissolved_o2 !== null
                ? (float) $overrides->min_dissolved_o2
                : $criticalMinConfig;

            if ($criticalMin !== null && $do < $criticalMin) {
                $alerts[] = [
                    'code' => 'do_low',
                    'severity' => 'warning',
                    'message' => sprintf(
                        'Dissolved oxygen (%.2f mg/L) is below critical minimum (%.2f mg/L).',
                        $do,
                        $criticalMin
                    ),
                    'category' => 'environment',
                    'context' => [
                        'value' => $do,
                        'critical_min' => $criticalMin,
                    ],
                ];
            }
        }

        // --- Biosecurity reactive H2O2 shock conditions ---
        if (! empty($biosecurity['reactive'])) {
            $reactive = $biosecurity['reactive'];
            $triggers = $reactive['trigger_conditions'] ?? [];

            $triggered = false;

            $turbidityGt = $triggers['turbidity_gt'] ?? null;
            $tempGt = $triggers['temp_gt'] ?? null;
            $doLt = $triggers['do_lt'] ?? null;

            // Apply per-device overrides when present
            if ($overrides) {
                if ($overrides->max_turbidity !== null) {
                    $turbidityGt = (float) $overrides->max_turbidity;
                }
                if ($overrides->max_temp !== null) {
                    $tempGt = (float) $overrides->max_temp;
                }
                if ($overrides->min_dissolved_o2 !== null) {
                    $doLt = (float) $overrides->min_dissolved_o2;
                }
            }

            if ($turbidityGt !== null && $turbidity !== null && $turbidity > $turbidityGt) {
                $triggered = true;
            }

            if ($tempGt !== null && $temp !== null && $temp > $tempGt) {
                $triggered = true;
            }

            if ($doLt !== null && $do !== null && $do < $doLt) {
                $triggered = true;
            }

            if ($triggered) {
                $alerts[] = [
                    'code' => 'biosecurity_reactive_h2o2',
                    'severity' => 'warning',
                    'message' => 'Conditions indicate high algae/biofilm risk. A hydrogen peroxide shock dose is recommended.',
                    'category' => 'biosecurity',
                    'context' => [
                        'turbidity' => $turbidity,
                        'temperature' => $temp,
                        'dissolved_oxygen' => $do,
                        'triggers' => [
                            'turbidity_gt' => $turbidityGt,
                            'temp_gt' => $tempGt,
                            'do_lt' => $doLt,
                        ],
                    ],
                ];

                $automations[] = [
                    'type' => 'biosecurity_shock',
                    'label' => 'H2O2 Shock Dose + Mix + Flush',
                    'control_key' => 'hydrogen_peroxide',
                    'required_supplies' => ['hydrogen_peroxide', 'water_tank'],
                    'dose_seconds' => $reactive['shock_dose_time_sec'] ?? null,
                    'reason' => 'Reactive biosecurity trigger conditions met',
                ];
            }
        }

        // --- Supply-based safety gate ---
        $supplies = $device->id
            ? Supply::where('smart_device_id', $device->id)->get()
            : collect();

        $supplyStatuses = [];
        foreach ($supplies as $supply) {
            $supplyStatuses[$supply->type] = $supply->status;
        }

        [$allowedAutomations, $blockedAutomations, $supplyAlerts, $globalStop] = $this->applySupplySafetyGate(
            $automations,
            $supplies,
        );

        if (! empty($supplyAlerts)) {
            $alerts = array_merge($alerts, $supplyAlerts);
        }

        return [
            'stage' => $stageKey,
            'plant_age_days' => $plantAgeDays,
            'alerts' => $alerts,
            'automations' => [
                'allowed' => $allowedAutomations,
                'blocked' => $blockedAutomations,
            ],
            'safety' => [
                'supplies' => $supplyStatuses,
                'stop_all_operations' => $globalStop,
            ],
        ];
    }

    private function resolvePlantAgeDays(SmartDevice $device): ?int
    {
        $plantGrowth = $device->plant_growth;

        if (! is_array($plantGrowth)) {
            return null;
        }

        // Always recalculate from planting_date to ensure accuracy
        // Don't rely on stored plant_age_days as it may be outdated
        if (! empty($plantGrowth['planting_date'])) {
            $plantingDate = Carbon::parse($plantGrowth['planting_date']);
            $days = (int) Carbon::today()->diffInDays($plantingDate);
            return $days >= 0 ? $days : null;
        }

        // Fallback to stored value if planting_date is not available
        if (isset($plantGrowth['plant_age_days']) && is_numeric($plantGrowth['plant_age_days'])) {
            $age = (int) $plantGrowth['plant_age_days'];
            return $age >= 0 ? $age : null;
        }

        return null;
    }

    private function resolveGrowthStage(?int $ageDays, array $growthStages): ?string
    {
        if ($ageDays === null) {
            return null; // Return null if age is unknown, don't default to vegetative
        }

        // Check each growth stage range
        foreach ($growthStages as $key => $stage) {
            $range = $stage['range_days'] ?? null;
            if (! is_array($range) || count($range) !== 2) {
                continue;
            }

            $min = (int) $range[0];
            $max = (int) $range[1];

            if ($ageDays >= $min && $ageDays <= $max) {
                return (string) $key;
            }
        }

        // If age is beyond all defined ranges, use the last stage (usually vegetative)
        // This handles plants older than 45 days
        if (isset($growthStages['vegetative'])) {
            return 'vegetative';
        }

        // Fallback to last defined stage
        $keys = array_keys($growthStages);
        if (! empty($keys)) {
            return (string) end($keys);
        }

        return null; // No stages configured
    }

    private function toFloat($value): ?float
    {
        if ($value === null) {
            return null;
        }

        if (is_numeric($value)) {
            return (float) $value;
        }

        return null;
    }

    /**
     * Apply supply safety rules to a list of proposed automations.
     *
     * Any automation whose required supplies are missing or marked as
     * need_refilled will be moved to the blocked list and accompanied
     * by an alert. If the water tank is empty, we recommend stopping
     * all automatic operations.
     */
    private function applySupplySafetyGate(array $automations, $suppliesCollection): array
    {
        $suppliesByType = $suppliesCollection->keyBy('type');

        $allowed = [];
        $blocked = [];
        $alerts = [];
        $globalStop = false;

        foreach ($automations as $automation) {
            $requiredSupplies = $automation['required_supplies'] ?? [];

            if (empty($requiredSupplies)) {
                $allowed[] = $automation;
                continue;
            }

            $blockedSupplies = [];
            foreach ($requiredSupplies as $type) {
                $supply = $suppliesByType->get($type);
                $status = $supply ? $supply->status : null;

                if ($status !== 'in_stock') {
                    $blockedSupplies[] = $type;
                }
            }

            if (! empty($blockedSupplies)) {
                $automation['blocked_due_to_supplies'] = $blockedSupplies;
                $blocked[] = $automation;

                $alerts[] = [
                    'code' => 'supply_empty_blocked_operation',
                    'severity' => 'warning',
                    'message' => sprintf(
                        'Operation "%s" was blocked because the following containers need to be refilled: %s.',
                        $automation['label'] ?? ($automation['type'] ?? 'unknown'),
                        implode(', ', $blockedSupplies)
                    ),
                    'category' => 'supply',
                    'context' => [
                        'blocked_supplies' => $blockedSupplies,
                        'operation' => $automation,
                    ],
                ];

                if (in_array('water_tank', $blockedSupplies, true)) {
                    $globalStop = true;
                }
            } else {
                $allowed[] = $automation;
            }
        }

        // Even if no automation is currently proposed, an empty water tank
        // should still signal that all operations must be stopped.
        $waterSupply = $suppliesByType->get('water_tank');
        if ($waterSupply && $waterSupply->status === 'need_refilled') {
            $globalStop = true;

            $alerts[] = [
                'code' => 'water_tank_empty_stop_all',
                'severity' => 'critical',
                'message' => 'Water tank is marked as need_refilled. All automatic operations should be stopped until refilled.',
                'category' => 'supply',
                'context' => [
                    'supply' => 'water_tank',
                    'status' => $waterSupply->status,
                ],
            ];
        }

        return [$allowed, $blocked, $alerts, $globalStop];
    }
}

