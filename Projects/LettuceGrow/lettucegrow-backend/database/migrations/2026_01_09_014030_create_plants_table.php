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
        Schema::create('plants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')
                ->constrained('smart_devices')
                ->cascadeOnDelete();
            $table->string('plant_type', 100)->default('lettuce');
            $table->string('system_type', 50)->default('nft'); // nft, dwc, etc.
            $table->date('planting_date');
            $table->enum('status', ['seedling', 'growing', 'mature', 'harvested'])->default('seedling');
            $table->date('harvested_at')->nullable();
            $table->text('notes')->nullable();
            $table->integer('quantity')->default(1); // Number of plants
            $table->string('batch_name', 100)->nullable(); // e.g., "Batch 1", "January Planting"
            $table->timestamps();
            
            // Index for efficient querying
            $table->index(['device_id', 'status']);
            $table->index('planting_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plants');
    }
};
