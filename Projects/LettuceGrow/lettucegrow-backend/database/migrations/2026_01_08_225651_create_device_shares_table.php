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
        Schema::create('device_shares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')
                ->constrained('smart_devices')
                ->cascadeOnDelete();
            $table->foreignId('shared_with_user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->foreignId('shared_by_user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->timestamps();

            // Ensure a user can only be shared a device once
            $table->unique(['device_id', 'shared_with_user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('device_shares');
    }
};
