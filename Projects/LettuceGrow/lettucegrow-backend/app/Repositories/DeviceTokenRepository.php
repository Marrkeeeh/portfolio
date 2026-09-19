<?php

namespace App\Repositories;

use App\Models\DeviceToken;
use Illuminate\Support\Collection;

class DeviceTokenRepository
{
    /**
     * Find device token by expo token
     */
    public function findByExpoToken(string $expoToken): ?DeviceToken
    {
        return DeviceToken::where('expo_token', $expoToken)->first();
    }

    /**
     * Find device token by device token (FCM/APNs token)
     */
    public function findByDeviceToken(string $deviceToken): ?DeviceToken
    {
        return DeviceToken::where('device_token', $deviceToken)->first();
    }

    /**
     * Get all active tokens for a user
     */
    public function getActiveTokensByUserId(int $userId): Collection
    {
        return DeviceToken::where('user_id', $userId)
            ->active()
            ->get();
    }

    /**
     * Get all active tokens
     */
    public function getAllActiveTokens(): Collection
    {
        return DeviceToken::active()->get();
    }

    /**
     * Get active tokens by platform
     */
    public function getActiveTokensByPlatform(string $platform): Collection
    {
        return DeviceToken::active()
            ->platform($platform)
            ->get();
    }

    /**
     * Create or update device token
     */
    public function createOrUpdate(array $data): DeviceToken
    {
        return DeviceToken::updateOrCreate(
            ['expo_token' => $data['expo_token']],
            $data
        );
    }

    /**
     * Delete device token by expo token
     */
    public function deleteByExpoToken(string $expoToken): bool
    {
        return DeviceToken::where('expo_token', $expoToken)->delete();
    }

    /**
     * Deactivate device token
     */
    public function deactivateByExpoToken(string $expoToken): bool
    {
        $token = $this->findByExpoToken($expoToken);
        if ($token) {
            $token->deactivate();
            return true;
        }
        return false;
    }

    /**
     * Clear user_id from device token (for logout)
     */
    public function clearUserIdByExpoToken(string $expoToken): bool
    {
        $token = $this->findByExpoToken($expoToken);
        if ($token) {
            $token->user_id = null;
            $token->save();
            return true;
        }
        return false;
    }

    /**
     * Clean up inactive tokens older than specified days
     */
    public function cleanupInactiveTokens(int $days = 30): int
    {
        return DeviceToken::where('is_active', false)
            ->where('updated_at', '<', now()->subDays($days))
            ->delete();
    }

    /**
     * Get device tokens by specific tokens array
     */
    public function findByTokens(array $tokens): Collection
    {
        return DeviceToken::whereIn('expo_token', $tokens)
            ->orWhereIn('device_token', $tokens)
            ->active()
            ->get();
    }
}

