<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sensor_data_evaluations', function (Blueprint $table) {
            $table->float('min_temp')->nullable()->change();
            $table->float('max_temp')->nullable()->change();
            $table->float('min_ec')->nullable()->change();
            $table->float('max_ec')->nullable()->change();
            $table->float('min_ph')->nullable()->change();
            $table->float('max_ph')->nullable()->change();
            $table->float('min_dissolved_o2')->nullable()->change();
            $table->float('max_dissolved_o2')->nullable()->change();
            $table->float('min_turbidity')->nullable()->change();
            $table->float('max_turbidity')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('sensor_data_evaluations', function (Blueprint $table) {
            $table->float('min_temp')->nullable(false)->change();
            $table->float('max_temp')->nullable(false)->change();
            $table->float('min_ec')->nullable(false)->change();
            $table->float('max_ec')->nullable(false)->change();
            $table->float('min_ph')->nullable(false)->change();
            $table->float('max_ph')->nullable(false)->change();
            $table->float('min_dissolved_o2')->nullable(false)->change();
            $table->float('max_dissolved_o2')->nullable(false)->change();
            $table->float('min_turbidity')->nullable(false)->change();
            $table->float('max_turbidity')->nullable(false)->change();
        });
    }
};
