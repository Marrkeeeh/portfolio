<?php

return [

    /*
    |--------------------------------------------------------------------------
    | System Configuration & Hardware Specs
    |--------------------------------------------------------------------------
    |
    */
    'system' => [
        'crop_varieties' => ['Lollo Rosso', 'Estrosa', 'Lalique'],
        'pump_flow_rate_ml_per_sec' => 1.67,
        'stabilization_time_sec'      => 60,
    ],

    /*
    |--------------------------------------------------------------------------
    | Growth Stage Thresholds (EC & pH)
    |--------------------------------------------------------------------------
    |
    */
    'growth_stages' => [
        'seedling' => [
            'range_days' => [1, 20],
            'ph' => [
                'min'    => 5.5,
                'max'    => 6.5,
                'target' => 6.0,
            ],
            'ec' => [
                'min'    => 0.8,
                'max'    => 1.2,
                'target' => 1.0, // dS/m
            ],
        ],
        'vegetative' => [
            'range_days' => [21, 45],
            'ph' => [
                'min'    => 5.5,
                'max'    => 6.5,
                'target' => 6.0,
            ],
            'ec' => [
                'min'    => 1.5,
                'max'    => 2.5,
                'target' => 2.0, // dS/m
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Environmental Safety Thresholds
    |--------------------------------------------------------------------------
    |
    */
    'environment' => [
        'turbidity' => [
            'optimal_min'  => 0.0,
            'optimal_max'  => 1.0,
            'critical_max' => 3.0, // NTU (Trigger Algae Mitigation)
        ],
        'dissolved_oxygen' => [
            'optimal_min'  => 5.0, // mg/L
            'critical_min' => 5.0, // Trigger Oxygenation/Algae Check
        ],
        'water_temp' => [
            'optimal_min'  => 20.0,
            'optimal_max'  => 24.0,
            'critical_max' => 25.0, // Celsius (High Algae Risk)
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Dosing Logic: "Pulse & Wait" Strategy
    |--------------------------------------------------------------------------
    |
    */
    'dosing' => [
        'ec_control' => [
            'nutrient_a_dose_time_sec' => 5,   // Approx 8.3 mL
            'chemical_spacing_sec'     => 60,  // Prevents Calcium/Phosphate binding
            'nutrient_b_dose_time_sec' => 5,   // Approx 8.3 mL
            'mixing_loop_time_sec'     => 300, // 5 Minutes homogenization
        ],
        'ph_control' => [
            'dose_time_sec'            => 1.5, // Approx 2.5 mL (Up or Down)
            'reaction_wait_time_sec'   => 600, // 10 Minutes mixing (Logarithmic reaction)
        ],
        'auto_refill' => [
            'max_runtime_sec'          => 300, // 5 Minutes before Emergency Stop
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Biosecurity & Algae Mitigation (H2O2)
    |--------------------------------------------------------------------------
    |
    */
    'biosecurity' => [
        'preventive' => [
            'interval_days' => 7,
            'dose_time_sec' => 10, // Approx 16 mL
        ],
        'reactive' => [
            'trigger_conditions' => [
                'turbidity_gt' => 3.0,
                'temp_gt'      => 25.0,
                'do_lt'        => 5.0,
            ],
            'shock_dose_time_sec' => 20,   // Approx 33 mL [cite: 93]
            'circulation_time_min'=> 30,
            'flush_time_sec'      => 120,
        ],
    ],


];
