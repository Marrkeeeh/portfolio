<?php

namespace Database\Seeders;

use App\Models\SmartDevice;
use App\Models\Supply;
use Illuminate\Database\Seeder;

class SupplySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $device = SmartDevice::first();

        if (! $device) {
            return;
        }

        $types = [
            'nutrient_a' => 'Nutrient A',
            'nutrient_b' => 'Nutrient B',
            'ph_up' => 'pH Up',
            'ph_down' => 'pH Down',
            'hydrogen_peroxide' => 'Hydrogen Peroxide',
            'water_tank' => 'Water Tank',
        ];

        foreach ($types as $type => $label) {
            Supply::firstOrCreate(
                [
                    'smart_device_id' => $device->id,
                    'type' => $type,
                ],
                [
                    'display_name' => $label,
                    'status' => 'in_stock',
                ],
            );
        }
    }
}
