<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Supply extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'smart_device_id',
        'type',
        'display_name',
        'status',
    ];

    /**
     * Get the smart device that owns this supply record.
     */
    public function smartDevice(): BelongsTo
    {
        return $this->belongsTo(SmartDevice::class);
    }
}
