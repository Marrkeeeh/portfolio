<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sensor_data_evaluations', function (Blueprint $table) {
            // pH Timing Constants (in milliseconds)
            $table->integer('ph_dose_time')->nullable()->after('max_ph');
            $table->integer('ph_retry_time')->nullable()->after('ph_dose_time');
            $table->integer('ph_check_interval')->nullable()->after('ph_retry_time');
            
            // EC Timing Constants (in milliseconds)
            $table->integer('ec_nutrient_a_time')->nullable()->after('max_ec');
            $table->integer('ec_stir_after_a_time')->nullable()->after('ec_nutrient_a_time');
            $table->integer('ec_nutrient_b_time')->nullable()->after('ec_stir_after_a_time');
            $table->integer('ec_clean_water_time')->nullable()->after('ec_nutrient_b_time');
            $table->integer('ec_retry_time')->nullable()->after('ec_clean_water_time');
            $table->integer('ec_check_interval')->nullable()->after('ec_retry_time');
            
            // Algae Timing Constants (in milliseconds)
            $table->integer('algae_h2o2_dose_time')->nullable()->after('max_turbidity');
            $table->integer('algae_mixing_time')->nullable()->after('algae_h2o2_dose_time');
            $table->integer('algae_clean_water_time')->nullable()->after('algae_mixing_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sensor_data_evaluations', function (Blueprint $table) {
            $table->dropColumn([
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
            ]);
        });
    }
};

