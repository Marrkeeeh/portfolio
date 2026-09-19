<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class Plant extends Model
{
    use HasFactory;

    /**
     * Plant statuses:
     * - seedling: Just planted, young growth
     * - growing: Active vegetative growth
     * - mature: Ready for harvest
     * - retired: Removed from the system (no longer productive)
     */
    const STATUS_SEEDLING = 'seedling';
    const STATUS_GROWING = 'growing';
    const STATUS_MATURE = 'mature';
    const STATUS_RETIRED = 'retired';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'device_id',
        'plant_type',
        'system_type',
        'planting_date',
        'status',
        'retired_at',
        'notes',
        'quantity',
        'batch_name',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'planting_date' => 'date',
        'retired_at' => 'date',
        'quantity' => 'integer',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = ['plant_age_days', 'is_retired', 'harvest_count', 'last_harvest_date', 'growth_stage'];

    /**
     * Get the device that owns this plant.
     */
    public function device(): BelongsTo
    {
        return $this->belongsTo(SmartDevice::class, 'device_id');
    }

    /**
     * Get the harvest records for this plant.
     */
    public function harvests(): HasMany
    {
        return $this->hasMany(PlantHarvest::class)->orderBy('harvest_date', 'desc');
    }

    /**
     * Calculate the plant's age in days from planting date to now (or retired date if retired).
     * Day 0 = planting day, Day 1 = first full day after planting.
     */
    public function getPlantAgeDaysAttribute(): int
    {
        $endDate = $this->retired_at ?? Carbon::today();
        // diffInDays returns the number of days between dates
        // For inclusive counting: if planted today, age = 0; if planted yesterday, age = 1
        return max(0, (int) $this->planting_date->diffInDays($endDate, false));
    }

    /**
     * Check if the plant has been retired (removed from system).
     */
    public function getIsRetiredAttribute(): bool
    {
        return $this->status === self::STATUS_RETIRED;
    }

    /**
     * Get the number of times this plant has been harvested.
     */
    public function getHarvestCountAttribute(): int
    {
        return $this->harvests()->count();
    }

    /**
     * Get the date of the last harvest.
     */
    public function getLastHarvestDateAttribute(): ?string
    {
        $lastHarvest = $this->harvests()->orderBy('harvest_date', 'desc')->first();
        return $lastHarvest ? $lastHarvest->harvest_date->toDateString() : null;
    }

    /**
     * Get the growth stage based on plant age (days).
     * Returns 'seedling' for days 1-20, 'vegetative' for days 21+, or null if age is 0 or invalid.
     * Note: Day 0 = planting day (no growth stage yet), Day 1 = first full day (seedling starts).
     */
    public function getGrowthStageAttribute(): ?string
    {
        // Calculate age directly to avoid dependency on plant_age_days accessor
        $endDate = $this->retired_at ?? Carbon::today();
        $ageDays = max(0, (int) $this->planting_date->diffInDays($endDate, false));
        
        // Day 0 (planting day) has no growth stage
        if ($ageDays < 1) {
            return null;
        }
        
        // Seedling: days 1-20
        if ($ageDays >= 1 && $ageDays <= 20) {
            return 'seedling';
        }
        
        // Vegetative: days 21 and beyond
        if ($ageDays >= 21) {
            return 'vegetative';
        }
        
        return null;
    }

    /**
     * Scope a query to only include active (non-retired) plants.
     */
    public function scopeActive($query)
    {
        return $query->whereNot('status', self::STATUS_RETIRED);
    }

    /**
     * Scope a query to only include retired plants.
     */
    public function scopeRetired($query)
    {
        return $query->where('status', self::STATUS_RETIRED);
    }

    /**
     * Scope a query to filter by device.
     */
    public function scopeForDevice($query, int $deviceId)
    {
        return $query->where('device_id', $deviceId);
    }
}

