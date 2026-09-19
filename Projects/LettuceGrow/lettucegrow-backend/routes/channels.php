<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::routes(['middleware' => ['auth:sanctum']]);

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('device-monitoring.{deviceId}', function ($user, $deviceId) {
    // Allow access to devices owned by the user OR shared with the user
    $device = \App\Models\SmartDevice::find($deviceId);
    
    if (!$device) {
        return false;
    }
    
    // Check if user owns the device
    if ($device->user_id === $user->id) {
        return true;
    }
    
    // Check if device is shared with the user
    return $device->isAccessibleBy($user->id);
});
