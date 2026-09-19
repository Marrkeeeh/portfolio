<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DissolvedOxygen extends Model
{
    protected $table = 'dissolved_oxygens';
    protected $fillable = [
        'smart_device_id',
        'value',
    ];
}
