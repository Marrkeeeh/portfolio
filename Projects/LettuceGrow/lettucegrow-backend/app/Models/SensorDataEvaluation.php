<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SensorDataEvaluation extends Model
{
    protected $table = 'sensor_data_evaluations';
    protected $fillable = [
        'smart_device_id',
        'min_temp',
        'max_temp',
        'min_ec',
        'max_ec',
        'min_ph',
        'max_ph',
        'min_dissolved_o2',
        'max_dissolved_o2',
        'min_turbidity',
        'max_turbidity',
        // pH Timing Constants
        'ph_dose_time',
        'ph_retry_time',
        'ph_check_interval',
        // EC Timing Constants
        'ec_nutrient_a_time',
        'ec_stir_after_a_time',
        'ec_nutrient_b_time',
        'ec_clean_water_time',
        'ec_retry_time',
        'ec_check_interval',
        // Algae Timing Constants
        'algae_h2o2_dose_time',
        'algae_mixing_time',
        'algae_clean_water_time',
    ];
}
