<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ControlHistory extends Model
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
        'event',
        'title',
        'description',
        'progress',
        'notification_type',
        'timestamp',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'timestamp' => 'datetime',
        'progress' => 'integer',
    ];

    /**
     * Get the device that owns this control history entry.
     */
    public function smartDevice(): BelongsTo
    {
        return $this->belongsTo(SmartDevice::class);
    }
}
