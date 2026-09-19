<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Turbidity extends Model
{
    protected $table = 'turbidities';
    protected $fillable = [
        'smart_device_id',
        'value',
    ];
}
