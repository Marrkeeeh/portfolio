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
        Schema::create('control_histories', function (Blueprint $table) {
            $table->id();
            
            $table->foreignId('smart_device_id')
                ->constrained('smart_devices')
                ->cascadeOnDelete();
            
            // Type of control: 'algae', 'ph', 'ec', 'notification'
            $table->string('type');
            
            // Event: 'started', 'completed', 'progress', 'sent'
            $table->string('event');
            
            // Title of the event
            $table->string('title');
            
            // Description/details
            $table->text('description')->nullable();
            
            // Progress percentage (0-100) for progress events
            $table->integer('progress')->nullable();
            
            // Notification type (for notification events)
            $table->string('notification_type')->nullable();
            
            // Timestamp when the event occurred
            $table->timestamp('timestamp')->useCurrent();
            
            $table->timestamps();
            
            // Indexes for better query performance
            $table->index(['smart_device_id', 'timestamp']);
            $table->index('type');
            $table->index('event');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('control_histories');
    }
};
