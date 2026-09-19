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
        Schema::create('plant_harvests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plant_id')
                ->constrained('plants')
                ->cascadeOnDelete();
            $table->foreignId('device_id')
                ->constrained('smart_devices')
                ->cascadeOnDelete();
            $table->date('harvest_date');
            $table->integer('quantity_harvested')->default(1);
            $table->decimal('yield_weight', 8, 2)->nullable(); // Weight in grams
            $table->enum('quality', ['excellent', 'good', 'fair', 'poor'])->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            // Index for efficient querying
            $table->index(['device_id', 'harvest_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plant_harvests');
    }
};
