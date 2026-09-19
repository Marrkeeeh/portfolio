<?php

namespace Database\Seeders;

use App\Models\SmartDevice;
use Illuminate\Database\Seeder;

class SmartDeviceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Seed an example unclaimed smart device with a randomized device code
        $rand = rand(100, 999);
        SmartDevice::create([
            'device_id' => 'LG-SMDEV-' . $rand,
            'device_pin' => substr(hash('sha256', '123456'), 0, 32),
            'name' => 'LettuceGrow Demo Device',
            'location' => 'Greenhouse A - Rack 1',
            'status' => 'unclaimed',
            'date_added' => now(),
        ]);

        // Seed an example claimed smart device with a randomized device code
        $rand = rand(100, 999);
        SmartDevice::create([
            'device_id' => 'LG-SMDEV-' . $rand,
            'device_pin' => substr(hash('sha256', '123456'), 0, 32),
            'name' => 'LettuceGrow Demo Device',
            'location' => 'Greenhouse A - Rack 2',
            'status' => 'unclaimed',
            'date_added' => now(),
        ]);
    }
}
