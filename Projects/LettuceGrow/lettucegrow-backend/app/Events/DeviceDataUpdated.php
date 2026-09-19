<?php

namespace App\Events;

use App\Models\SmartDevice;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DeviceDataUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public SmartDevice $device,
        public array $changed,
    ) {
    }

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('device-monitoring.' . $this->device->id);
    }

    public function broadcastAs(): string
    {
        return 'sensor-data-updated';
    }

    public function broadcastWith(): array
    {
        return [
            'device_id' => $this->device->id,
            'device_uid' => $this->device->device_id,
            'changes' => $this->changed,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
