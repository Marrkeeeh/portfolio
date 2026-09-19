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
        Schema::create('supplies', function (Blueprint $table) {
            $table->id();

            // Smart device this supply record belongs to
            $table->foreignId('smart_device_id')
                ->constrained('smart_devices')
                ->cascadeOnDelete();

            // Fixed supply type for the system
            $table->enum('type', [
                'nutrient_a',
                'nutrient_b',
                'ph_up',
                'ph_down',
                'hydrogen_peroxide',
                'water_tank',
            ]);

            // Human friendly display name (e.g. "Nutrient A")
            $table->string('display_name');

            // High level status used by the app UI
            $table->enum('status', ['in_stock', 'need_refilled'])->default('in_stock');

            $table->timestamps();

            $table->unique(['smart_device_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supplies');
    }
};
