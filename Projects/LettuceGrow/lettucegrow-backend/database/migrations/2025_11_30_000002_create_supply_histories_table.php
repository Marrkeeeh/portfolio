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
        Schema::create('supply_histories', function (Blueprint $table) {
            $table->id();

            $table->foreignId('supply_id')
                ->constrained('supplies')
                ->cascadeOnDelete();

            $table->foreignId('smart_device_id')
                ->constrained('smart_devices')
                ->cascadeOnDelete();

            $table->enum('from_status', ['in_stock', 'need_refilled'])->nullable();
            $table->enum('to_status', ['in_stock', 'need_refilled']);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supply_histories');
    }
};
