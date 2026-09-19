<?php

namespace App\DTOs;

class NotificationDTO
{
    public function __construct(
        public readonly string $title,
        public readonly string $body,
        public readonly ?array $data = null,
        public readonly ?int $userId = null,
        public readonly ?array $tokens = null,
        public readonly ?string $sound = 'default',
        public readonly ?int $badge = null,
        public readonly ?string $channelId = 'default',
        public readonly ?string $imageUrl = null,
    ) {}

    /**
     * Create DTO from request data
     */
    public static function fromRequest(array $data): self
    {
        return new self(
            title: $data['notification']['title'],
            body: $data['notification']['body'],
            data: $data['notification']['data'] ?? null,
            userId: $data['userId'] ?? null,
            tokens: $data['tokens'] ?? null,
            sound: $data['notification']['sound'] ?? 'default',
            badge: $data['notification']['badge'] ?? null,
            channelId: $data['notification']['channelId'] ?? 'default',
            imageUrl: $data['notification']['imageUrl'] ?? null,
        );
    }

    /**
     * Convert to FCM message format
     */
    public function toFCMMessage(): array
    {
        $message = [
            'notification' => [
                'title' => $this->title,
                'body' => $this->body,
            ],
            'android' => [
                'priority' => 'high',
                'notification' => [
                    'sound' => $this->sound,
                    'channel_id' => $this->channelId,
                ],
            ],
        ];

        // Add image to notification if provided
        if ($this->imageUrl) {
            $message['notification']['image'] = $this->imageUrl;
            $message['android']['notification']['image'] = $this->imageUrl;
        }

        // Only add data if it exists and is not empty
        if (!empty($this->data) && is_array($this->data)) {
            // Convert all values to strings as FCM requires
            $message['data'] = array_map(function($value) {
                return is_string($value) ? $value : json_encode($value);
            }, $this->data);
        }

        // Only add APNS config if badge is provided or if there's an image
        if ($this->badge !== null || $this->imageUrl !== null) {
            $apsPayload = ['sound' => $this->sound];
            
            if ($this->badge !== null) {
                $apsPayload['badge'] = $this->badge;
            }
            
            $message['apns'] = [
                'payload' => [
                    'aps' => $apsPayload,
                ],
            ];
            
            // Add image for iOS
            if ($this->imageUrl) {
                $message['apns']['fcm_options'] = [
                    'image' => $this->imageUrl,
                ];
            }
        }

        return $message;
    }

    /**
     * Convert to database format
     */
    public function toDatabase(): array
    {
        return [
            'title' => $this->title,
            'body' => $this->body,
            'data' => $this->data,
            'user_id' => $this->userId,
            'tokens' => $this->tokens,
        ];
    }
}

