<?php

namespace App\DTOs;

class DeviceTokenDTO
{
    public function __construct(
        public readonly string $expoToken,
        public readonly string $deviceToken,
        public readonly string $platform,
        public readonly ?string $deviceId = null,
        public readonly ?string $deviceName = null,
        public readonly ?int $userId = null,
    ) {}

    /**
     * Create DTO from request data
     */
    public static function fromRequest(array $data): self
    {
        return new self(
            expoToken: $data['expoToken'],
            deviceToken: $data['deviceToken'],
            platform: $data['platform'],
            deviceId: $data['deviceId'] ?? null,
            deviceName: $data['deviceName'] ?? null,
            userId: $data['userId'] ?? null,
        );
    }

    /**
     * Convert to array
     */
    public function toArray(): array
    {
        return [
            'expo_token' => $this->expoToken,
            'device_token' => $this->deviceToken,
            'platform' => $this->platform,
            'device_id' => $this->deviceId,
            'device_name' => $this->deviceName,
            'user_id' => $this->userId,
            'is_active' => true,
            'last_used_at' => now(),
        ];
    }
}

