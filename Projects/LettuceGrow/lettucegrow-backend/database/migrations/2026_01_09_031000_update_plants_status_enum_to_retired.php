<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Ensure the plants.status enum supports the new 'retired' status
     * instead of the old 'harvested' value.
     */
    public function up(): void
    {
        // Update the enum definition to use 'retired' instead of 'harvested'
        DB::statement("
            ALTER TABLE plants
            MODIFY COLUMN status ENUM('seedling','growing','mature','retired') NOT NULL DEFAULT 'seedling'
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert enum definition back to original with 'harvested'
        DB::statement("
            ALTER TABLE plants
            MODIFY COLUMN status ENUM('seedling','growing','mature','harvested') NOT NULL DEFAULT 'seedling'
        ");
    }
};


