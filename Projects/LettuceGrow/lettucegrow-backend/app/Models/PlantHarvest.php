<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlantHarvest extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'plant_id',
        'device_id',
        'harvest_cycle',
        'harvest_date',
        'quantity_harvested',
        'yield_weight',
        'quality',
        'notes',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'harvest_date' => 'date',
        'harvest_cycle' => 'integer',
        'quantity_harvested' => 'integer',
        'yield_weight' => 'decimal:2',
    ];

    /**
     * Get the plant associated with this harvest.
     */
    public function plant(): BelongsTo
    {
        return $this->belongsTo(Plant::class);
    }

    /**
     * Get the device associated with this harvest.
     */
    public function device(): BelongsTo
    {
        return $this->belongsTo(SmartDevice::class, 'device_id');
    }

    /**
     * Get harvest cycle label (1st, 2nd, 3rd, etc.)
     */
    public function getCycleLabelAttribute(): string
    {
        $cycle = $this->harvest_cycle;
        $suffix = match (true) {
            $cycle === 1 => 'st',
            $cycle === 2 => 'nd',
            $cycle === 3 => 'rd',
            default => 'th',
        };
        return "{$cycle}{$suffix} harvest";
    }
}

