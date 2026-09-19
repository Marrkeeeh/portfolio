<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ECLevel extends Model
{
    protected $table = 'ec_levels';
    protected $fillable = [
        'smart_device_id',
        'value',
    ];
}
