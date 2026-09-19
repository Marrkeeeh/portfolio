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
        Schema::create('sensor_data_evaluations', function (Blueprint $table) {
            $table->id();
            // Smart device this supply record belongs to
            $table->foreignId('smart_device_id')
                ->constrained('smart_devices')
                ->cascadeOnDelete();
            $table->float('min_temp');
            $table->float('max_temp');
            $table->float('min_ec');
            $table->float('max_ec');
            $table->float('min_ph');
            $table->float('max_ph');
            $table->float('min_dissolved_o2');
            $table->float('max_dissolved_o2');
            $table->float('min_turbidity');
            $table->float('max_turbidity');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sensor_data_evaluations');
    }
};
