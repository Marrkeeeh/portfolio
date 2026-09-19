<?php

namespace App\Services\Notification;

use App\DTOs\DeviceTokenDTO;
use App\DTOs\NotificationDTO;
use App\Models\DeviceToken;
use App\Repositories\DeviceTokenRepository;
use App\Repositories\PushNotificationRepository;
use App\Services\Notification\Services\Expo\ExpoPushNotificationService;
use App\Services\Notification\Services\Firebase\FirebaseCloudMessagingService;
use Exception;
use Illuminate\Support\Facades\Log;

class PushNotificationService
{
    public function __construct(
        private readonly DeviceTokenRepository $deviceTokenRepository,
        private readonly PushNotificationRepository $notificationRepository,
        private readonly FirebaseCloudMessagingService $fcmService,
        private readonly ExpoPushNotificationService $expoService,
    ) {}

    /**
     * Register a device token
     */
    public function registerDeviceToken(DeviceTokenDTO $dto): DeviceToken
    {
        try {
            return $this->deviceTokenRepository->createOrUpdate($dto->toArray());
        } catch (Exception $e) {
            Log::error('Device token registration error: ' . $e->getMessage());
            throw new Exception('Failed to register device token');
        }
    }

    /**
     * Unregister a device token (clears user_id on logout)
     */
    public function unregisterDeviceToken(string $expoToken): bool
    {
        try {
            return $this->deviceTokenRepository->clearUserIdByExpoToken($expoToken);
        } catch (Exception $e) {
            Log::error('Device token unregistration error: ' . $e->getMessage());
            throw new Exception('Failed to unregister device token');
        }
    }

    /**
     * Send notification to tokens with automatic fallback
     * Always tries FCM first, falls back to Expo if token is invalid
     */
    private function sendToDeviceTokens(array $deviceTokens, array $notification): array
    {
        $totalSuccess = 0;
        $totalFailure = 0;
        $allResults = [];

        foreach ($deviceTokens as $token) {
            Log::info('📱 ========== PROCESSING TOKEN ==========');
            Log::info('📱 Token: ' . substr($token, 0, 60) . '...');
            
            // Always try FCM first with device_token
            Log::info('🔵 Trying FCM first...');
            $fcmResult = $this->fcmService->sendToToken($token, $notification);
            
            if ($fcmResult['success']) {
                // FCM succeeded
                $totalSuccess++;
                Log::info('✅ FCM send successful');
                $allResults[] = [
                    'token' => $token,
                    'method' => 'FCM',
                    'result' => $fcmResult,
                ];
            } elseif (!empty($fcmResult['is_invalid_token'])) {
                // FCM failed due to invalid token, try Expo fallback
                Log::warning('⚠️ FCM failed with invalid token, trying Expo fallback...');
                
                // Find the expo_token for this device_token
                $deviceTokenModel = $this->deviceTokenRepository->findByDeviceToken($token);
                
                if ($deviceTokenModel && $deviceTokenModel->expo_token) {
                    Log::info('🔍 Found expo_token for fallback: ' . substr($deviceTokenModel->expo_token, 0, 60) . '...');
                    $expoResult = $this->expoService->sendToToken($deviceTokenModel->expo_token, $notification);
                    
                    if ($expoResult['success']) {
                        $totalSuccess++;
                        Log::info('✅ Expo fallback successful!');
                        $allResults[] = [
                            'token' => $token,
                            'expo_token' => $deviceTokenModel->expo_token,
                            'method' => 'Expo (Fallback)',
                            'result' => $expoResult,
                        ];
                    } else {
                        $totalFailure++;
                        Log::error('❌ Both FCM and Expo failed for this token');
                        $allResults[] = [
                            'token' => $token,
                            'method' => 'Both Failed',
                            'fcm_result' => $fcmResult,
                            'expo_result' => $expoResult,
                        ];
                    }
                } else {
                    $totalFailure++;
                    Log::error('❌ No expo_token found for fallback');
                    $allResults[] = [
                        'token' => $token,
                        'method' => 'FCM Failed - No Expo Token',
                        'result' => $fcmResult,
                    ];
                }
            } else {
                // FCM failed for other reason (not invalid token)
                $totalFailure++;
                Log::error('❌ FCM failed: ' . ($fcmResult['error'] ?? 'Unknown error'));
                $allResults[] = [
                    'token' => $token,
                    'method' => 'FCM',
                    'result' => $fcmResult,
                ];
            }
        }

        Log::info('📊 ========== FINAL SUMMARY ==========');
        Log::info('✅ Successful: ' . $totalSuccess);
        Log::error('❌ Failed: ' . $totalFailure);

        return [
            'success_count' => $totalSuccess,
            'failure_count' => $totalFailure,
            'results' => $allResults,
        ];
    }

    /**
     * Extract appropriate tokens from device token collection
     * Returns device_token for FCM attempts
     */
    private function extractTokensFromCollection($tokens): array
    {
        Log::info('🔍 ========== EXTRACTING TOKENS ==========');
        Log::info('🔍 Total tokens in collection: ' . $tokens->count());
        
        foreach ($tokens as $tokenModel) {
            Log::info('🔍 Token ID: ' . $tokenModel->id);
            Log::info('🔍 Expo Token: ' . substr($tokenModel->expo_token, 0, 60) . '...');
            Log::info('🔍 Device Token: ' . substr($tokenModel->device_token, 0, 60) . '...');
        }
        
        // Use device_token for FCM attempts (native tokens)
        // If FCM fails, the sendToDeviceTokens will fetch expo_token for fallback
        $extractedTokens = $tokens->pluck('device_token')->filter()->toArray();
        
        Log::info('🔍 Extracted device tokens for FCM:');
        foreach ($extractedTokens as $token) {
            Log::info('🔍 - ' . substr($token, 0, 60) . '...');
        }
        
        return $extractedTokens;
    }

    /**
     * Send notification to specific user
     */
    public function sendToUser(NotificationDTO $dto): array
    {
        try {
            if (!$dto->userId) {
                throw new Exception('User ID is required');
            }

            // Get all active tokens for the user
            $tokens = $this->deviceTokenRepository->getActiveTokensByUserId($dto->userId);

            if ($tokens->isEmpty()) {
                return [
                    'success' => false,
                    'message' => 'No active device tokens found for user',
                ];
            }

            // Extract device tokens (FCM/APNs tokens)
            $deviceTokens = $this->extractTokensFromCollection($tokens);

            // Create notification record
            $notification = $this->notificationRepository->create([
                ...$dto->toDatabase(),
                'tokens' => $deviceTokens,
            ]);

            // Send via appropriate service (Expo or FCM)
            $result = $this->sendToDeviceTokens(
                $deviceTokens,
                $dto->toFCMMessage()
            );

            // Update notification status
            $this->notificationRepository->markAsSent(
                $notification->id,
                $result['success_count'],
                $result['failure_count']
            );

            // Mark tokens as used
            foreach ($tokens as $token) {
                $token->markAsUsed();
            }

            return [
                'success' => true,
                'notification_id' => $notification->id,
                'sent_count' => $result['success_count'],
                'failed_count' => $result['failure_count'],
            ];
        } catch (Exception $e) {
            Log::error('Send notification to user error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Send notification to specific tokens
     */
    public function sendToTokens(NotificationDTO $dto): array
    {
        try {
            if (!$dto->tokens || empty($dto->tokens)) {
                throw new Exception('Tokens array is required');
            }

            // Validate tokens exist in database
            $validTokens = $this->deviceTokenRepository->findByTokens($dto->tokens);

            if ($validTokens->isEmpty()) {
                return [
                    'success' => false,
                    'message' => 'No valid tokens found',
                ];
            }

            // Extract expo tokens (will work for both Expo and native)
            $deviceTokens = $this->extractTokensFromCollection($validTokens);

            // Create notification record
            $notification = $this->notificationRepository->create([
                ...$dto->toDatabase(),
                'tokens' => $deviceTokens,
            ]);

            // Send via appropriate service (Expo or FCM)
            $result = $this->sendToDeviceTokens(
                $deviceTokens,
                $dto->toFCMMessage()
            );

            // Update notification status
            $this->notificationRepository->markAsSent(
                $notification->id,
                $result['success_count'],
                $result['failure_count']
            );

            // Mark tokens as used
            foreach ($validTokens as $token) {
                $token->markAsUsed();
            }

            return [
                'success' => true,
                'notification_id' => $notification->id,
                'sent_count' => $result['success_count'],
                'failed_count' => $result['failure_count'],
            ];
        } catch (Exception $e) {
            Log::error('Send notification to tokens error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Send notification to all users
     */
    public function sendToAll(NotificationDTO $dto): array
    {
        try {
            // Get all active tokens
            $tokens = $this->deviceTokenRepository->getAllActiveTokens();

            if ($tokens->isEmpty()) {
                return [
                    'success' => false,
                    'message' => 'No active device tokens found',
                ];
            }

            // Extract expo tokens (will work for both Expo and native)
            $deviceTokens = $this->extractTokensFromCollection($tokens);

            // Create notification record
            $notification = $this->notificationRepository->create([
                ...$dto->toDatabase(),
                'tokens' => $deviceTokens,
            ]);

            // Send via FCM in batches (FCM recommends max 500 per batch)
            $batches = array_chunk($deviceTokens, 500);
            $totalSuccess = 0;
            $totalFailure = 0;

            foreach ($batches as $batch) {
                $result = $this->fcmService->sendToMultipleTokens(
                    $batch,
                    $dto->toFCMMessage()
                );

                $totalSuccess += $result['success_count'];
                $totalFailure += $result['failure_count'];
            }

            // Update notification status
            $this->notificationRepository->markAsSent(
                $notification->id,
                $totalSuccess,
                $totalFailure
            );

            return [
                'success' => true,
                'notification_id' => $notification->id,
                'sent_count' => $totalSuccess,
                'failed_count' => $totalFailure,
            ];
        } catch (Exception $e) {
            Log::error('Send notification to all error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Send notification to a topic
     */
    public function sendToTopic(string $topic, NotificationDTO $dto): array
    {
        try {
            // Create notification record
            $notification = $this->notificationRepository->create([
                ...$dto->toDatabase(),
                'tokens' => ['topic:' . $topic],
            ]);

            // Send via FCM topic
            $result = $this->fcmService->sendToTopic($topic, $dto->toFCMMessage());

            if ($result['success']) {
                $this->notificationRepository->markAsSent($notification->id, 1, 0);
            } else {
                $this->notificationRepository->markAsFailed($notification->id, $result['error']);
            }

            return [
                'success' => $result['success'],
                'notification_id' => $notification->id,
                'message_id' => $result['message_id'] ?? null,
            ];
        } catch (Exception $e) {
            Log::error('Send notification to topic error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get user's device tokens
     */
    public function getUserTokens(int $userId): array
    {
        $tokens = $this->deviceTokenRepository->getActiveTokensByUserId($userId);
        return $tokens->toArray();
    }

    /**
     * Clean up old inactive tokens
     */
    public function cleanupInactiveTokens(int $days = 30): int
    {
        return $this->deviceTokenRepository->cleanupInactiveTokens($days);
    }

    /**
     * Get notification statistics
     */
    public function getStatistics(): array
    {
        return $this->notificationRepository->getStatistics();
    }

    /**
     * Get all registered devices
     */
    public function getAllDevices(): array
    {
        $devices = $this->deviceTokenRepository->getAllActiveTokens();
        return $devices->toArray();
    }

    /**
     * Get notification history
     */
    public function getHistory(int $limit = 20): array
    {
        return $this->notificationRepository->getHistory($limit);
    }

    /**
     * Send notification to specific device IDs
     */
    public function sendToDeviceIds(array $deviceIds, NotificationDTO $dto): array
    {
        try {
            // Get devices by IDs
            $devices = DeviceToken::whereIn('id', $deviceIds)
                ->where('is_active', true)
                ->get();

            if ($devices->isEmpty()) {
                return [
                    'success' => false,
                    'message' => 'No active devices found',
                ];
            }

            // Extract expo tokens (will work for both Expo and native)
            $deviceTokens = $this->extractTokensFromCollection($devices);

            // Create notification record
            $notification = $this->notificationRepository->create([
                ...$dto->toDatabase(),
                'tokens' => $deviceTokens,
            ]);

            // Send via appropriate service (Expo or FCM)
            $result = $this->sendToDeviceTokens(
                $deviceTokens,
                $dto->toFCMMessage()
            );

            // Update notification status
            $this->notificationRepository->markAsSent(
                $notification->id,
                $result['success_count'],
                $result['failure_count']
            );

            // Mark tokens as used
            foreach ($devices as $device) {
                $device->markAsUsed();
            }

            return [
                'success' => true,
                'notification_id' => $notification->id,
                'sent_count' => $result['success_count'],
                'failed_count' => $result['failure_count'],
            ];
        } catch (Exception $e) {
            Log::error('Send notification to device IDs error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Delete a notification
     */
    public function deleteNotification(int $id): bool
    {
        try {
            return $this->notificationRepository->delete($id);
        } catch (Exception $e) {
            Log::error('Delete notification error: ' . $e->getMessage());
            throw new Exception('Failed to delete notification');
        }
    }

    /**
     * Delete multiple notifications
     */
    public function deleteMultipleNotifications(array $ids): int
    {
        try {
            return $this->notificationRepository->deleteMultiple($ids);
        } catch (Exception $e) {
            Log::error('Delete multiple notifications error: ' . $e->getMessage());
            throw new Exception('Failed to delete notifications');
        }
    }

    /**
     * Delete all notifications
     */
    public function deleteAllNotifications(): int
    {
        try {
            return $this->notificationRepository->deleteAll();
        } catch (Exception $e) {
            Log::error('Delete all notifications error: ' . $e->getMessage());
            throw new Exception('Failed to delete all notifications');
        }
    }

    /**
     * Get user's notification history with pagination
     */
    public function getUserNotificationHistory(int $userId, int $page = 1, int $limit = 5): array
    {
        try {
            return $this->notificationRepository->getUserHistoryPaginated($userId, $page, $limit);
        } catch (Exception $e) {
            Log::error('Get user notification history error: ' . $e->getMessage());
            throw new Exception('Failed to get notification history');
        }
    }

    /**
     * Mark a notification as read
     */
    public function markNotificationAsRead(int $id): bool
    {
        try {
            return $this->notificationRepository->markAsRead($id);
        } catch (Exception $e) {
            Log::error('Mark notification as read error: ' . $e->getMessage());
            throw new Exception('Failed to mark notification as read');
        }
    }

    /**
     * Mark all notifications as read
     */
    public function markAllNotificationsAsRead(?int $userId = null): int
    {
        try {
            return $this->notificationRepository->markAllAsRead($userId);
        } catch (Exception $e) {
            Log::error('Mark all notifications as read error: ' . $e->getMessage());
            throw new Exception('Failed to mark all notifications as read');
        }
    }
}

