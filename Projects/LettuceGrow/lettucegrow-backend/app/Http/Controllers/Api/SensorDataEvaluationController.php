<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SensorDataEvaluation;
use App\Models\SmartDevice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SensorDataEvaluationController extends Controller
{
    /**
     * Get the list of timing constant fields that need conversion
     */
    private function getTimingFields(): array
    {
        return [
            'ph_dose_time',
            'ph_retry_time',
            'ph_check_interval',
            'ec_nutrient_a_time',
            'ec_stir_after_a_time',
            'ec_nutrient_b_time',
            'ec_clean_water_time',
            'ec_retry_time',
            'ec_check_interval',
            'algae_h2o2_dose_time',
            'algae_mixing_time',
            'algae_clean_water_time',
        ];
    }

    /**
     * Convert timing constants from milliseconds to seconds for API response
     */
    private function convertTimingFieldsToSeconds(SensorDataEvaluation $evaluation): array
    {
        $data = $evaluation->toArray();
        $timingFields = $this->getTimingFields();

        foreach ($timingFields as $field) {
            if (isset($data[$field]) && $data[$field] !== null) {
                $data[$field] = $data[$field] / 1000;
            }
        }

        return $data;
    }

    public function show(Request $request, SmartDevice $device): JsonResponse
    {
        $user = $request->user();

        // Check if user has access (owner or shared) - shared users can view
        if (! $user || !$device->isAccessibleBy($user->id)) {
            return response()->json([
                'success' => false,
                'message' => 'Device not found.',
            ], 404);
        }

        $evaluation = SensorDataEvaluation::where('smart_device_id', $device->id)->first();

        $evaluationData = $evaluation ? $this->convertTimingFieldsToSeconds($evaluation) : null;

        return response()->json([
            'success' => true,
            'data' => [
                'sensor_evaluation' => $evaluationData,
            ],
        ]);
    }

    public function update(Request $request, SmartDevice $device): JsonResponse
    {
        $user = $request->user();

        // Only owner can update sensor evaluation settings
        if (! $user || $device->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to update this device.',
            ], 403);
        }

        $validated = $request->validate([
            'min_temp' => ['nullable', 'numeric'],
            'max_temp' => ['nullable', 'numeric'],
            'min_ec' => ['nullable', 'numeric'],
            'max_ec' => ['nullable', 'numeric'],
            'min_ph' => ['nullable', 'numeric'],
            'max_ph' => ['nullable', 'numeric'],
            'min_dissolved_o2' => ['nullable', 'numeric'],
            'max_dissolved_o2' => ['nullable', 'numeric'],
            'min_turbidity' => ['nullable', 'numeric'],
            'max_turbidity' => ['nullable', 'numeric'],
            // pH Timing Constants (received in seconds, will be converted to milliseconds)
            'ph_dose_time' => ['nullable', 'numeric', 'min:0'],
            'ph_retry_time' => ['nullable', 'numeric', 'min:0'],
            'ph_check_interval' => ['nullable', 'numeric', 'min:0'],
            // EC Timing Constants (received in seconds, will be converted to milliseconds)
            'ec_nutrient_a_time' => ['nullable', 'numeric', 'min:0'],
            'ec_stir_after_a_time' => ['nullable', 'numeric', 'min:0'],
            'ec_nutrient_b_time' => ['nullable', 'numeric', 'min:0'],
            'ec_clean_water_time' => ['nullable', 'numeric', 'min:0'],
            'ec_retry_time' => ['nullable', 'numeric', 'min:0'],
            'ec_check_interval' => ['nullable', 'numeric', 'min:0'],
            // Algae Timing Constants (received in seconds, will be converted to milliseconds)
            'algae_h2o2_dose_time' => ['nullable', 'numeric', 'min:0'],
            'algae_mixing_time' => ['nullable', 'numeric', 'min:0'],
            'algae_clean_water_time' => ['nullable', 'numeric', 'min:0'],
        ]);

        // Convert timing constants from seconds to milliseconds before saving
        $timingFields = $this->getTimingFields();

        foreach ($timingFields as $field) {
            if (isset($validated[$field]) && $validated[$field] !== null) {
                $validated[$field] = (int) round($validated[$field] * 1000);
            }
        }

        $evaluation = SensorDataEvaluation::updateOrCreate(
            ['smart_device_id' => $device->id],
            $validated,
        );

        // Convert back to seconds for response
        $evaluationData = $this->convertTimingFieldsToSeconds($evaluation);

        return response()->json([
            'success' => true,
            'message' => 'Sensor evaluation updated successfully.',
            'data' => [
                'sensor_evaluation' => $evaluationData,
            ],
        ]);
    }
}
