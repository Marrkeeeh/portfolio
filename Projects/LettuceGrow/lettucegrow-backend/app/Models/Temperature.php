<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Temperature extends Model
{
    protected $table = 'temperatures';
    protected $fillable = [
        'smart_device_id',
        'value',
    ];
}
