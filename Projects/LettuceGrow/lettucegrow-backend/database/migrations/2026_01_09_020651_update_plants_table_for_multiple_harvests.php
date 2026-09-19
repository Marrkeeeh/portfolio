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
     * Changes to support cut-and-come-again harvesting:
     * - Rename 'harvested_at' to 'retired_at' (plant is only retired when removed from system)
     * - Change status enum: 'harvested' becomes 'retired'
     * - Add 'harvest_cycle' to plant_harvests to track which harvest (1st, 2nd, 3rd)
     */
    public function up(): void
    {
        // Rename harvested_at to retired_at
        Schema::table('plants', function (Blueprint $table) {
            $table->renameColumn('harvested_at', 'retired_at');
        });

        // Update status values: change 'harvested' to 'retired'
        DB::table('plants')
            ->where('status', 'harvested')
            ->update(['status' => 'retired']);

        // Add harvest_cycle to plant_harvests table
        Schema::table('plant_harvests', function (Blueprint $table) {
            $table->integer('harvest_cycle')->default(1)->after('device_id');
        });

        // Update existing harvests to set harvest_cycle based on order
        $plants = DB::table('plants')->get();
        foreach ($plants as $plant) {
            $harvests = DB::table('plant_harvests')
                ->where('plant_id', $plant->id)
                ->orderBy('harvest_date', 'asc')
                ->get();
            
            $cycle = 1;
            foreach ($harvests as $harvest) {
                DB::table('plant_harvests')
                    ->where('id', $harvest->id)
                    ->update(['harvest_cycle' => $cycle]);
                $cycle++;
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove harvest_cycle from plant_harvests
        Schema::table('plant_harvests', function (Blueprint $table) {
            $table->dropColumn('harvest_cycle');
        });

        // Revert status values: change 'retired' back to 'harvested'
        DB::table('plants')
            ->where('status', 'retired')
            ->update(['status' => 'harvested']);

        // Rename retired_at back to harvested_at
        Schema::table('plants', function (Blueprint $table) {
            $table->renameColumn('retired_at', 'harvested_at');
        });
    }
};
