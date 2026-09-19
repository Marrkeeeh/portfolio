<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class phLevel extends Model
{
    protected $table = 'ph_levels';
    protected $fillable = [
        'smart_device_id',
        'value',
    ];
}
