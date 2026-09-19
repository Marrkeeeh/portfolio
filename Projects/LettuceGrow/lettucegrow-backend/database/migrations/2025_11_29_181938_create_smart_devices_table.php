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
        Schema::create('smart_devices', function (Blueprint $table) {
            $table->id();

            // Public-facing device identifier printed on the hardware
            $table->string('device_id')->unique();

            // Owner of the device (nullable until the device is claimed)
            $table->foreignId('user_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();

            // Human-friendly device name
            $table->string('name');

            // Optional physical/location label (e.g. "Greenhouse A - Rack 1")
            $table->string('location')->nullable();

            // Device status: unclaimed (factory/new), claimed, active, inactive
            $table->enum('status', ['unclaimed', 'claimed', 'active', 'inactive'])
                ->default('unclaimed');

            // When the device record was added to the system
            $table->timestamp('date_added')->nullable();

            // When the device was actually installed/connected for this user
            $table->timestamp('date_installed')->nullable();

            // Plant growth information (e.g. plant_type, planting_date, system_type, etc.)
            $table->json('plant_growth')->nullable();

            // Device-specific settings stored as JSON (thresholds, schedules, etc.)
            $table->json('settings')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('smart_devices');
    }
};
