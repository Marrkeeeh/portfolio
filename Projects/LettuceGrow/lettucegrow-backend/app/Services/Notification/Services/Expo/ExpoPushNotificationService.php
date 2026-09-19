<?php

namespace App\Services\Notification\Services\Expo;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExpoPushNotificationService
{
    private const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

    /**
     * Check if a token is an Expo push token
     */
    public static function isExpoToken(string $token): bool
    {
        return str_starts_with($token, 'ExponentPushToken[');
    }

    /**
     * Send notification to a single Expo token
     */
    public function sendToToken(string $token, array $notification): array
    {
        try {
            Log::info('📱 ========== SENDING EXPO PUSH NOTIFICATION ==========');
            Log::info('📱 Expo Token: ' . substr($token, 0, 50) . '...');
            Log::info('📱 Notification Title: ' . ($notification['notification']['title'] ?? 'N/A'));
            Log::info('📱 Notification Body: ' . ($notification['notification']['body'] ?? 'N/A'));

            // Check if this is a critical alert
            $data = $notification['data'] ?? [];
            $notificationType = $data['type'] ?? null;
            $isCritical = in_array($notificationType, ['alert', 'warning']);

            // Convert our notification format to Expo format
            $expoMessage = [
                'to' => $token,
                'title' => $notification['notification']['title'] ?? '',
                'body' => $notification['notification']['body'] ?? '',
                'sound' => $isCritical ? 'default' : 'default', // Can use custom sound for critical
                'priority' => $isCritical ? 'high' : 'high',
            ];

            // Add critical alert properties for iOS
            if ($isCritical) {
                $expoMessage['criticalAlert'] = true;
                $expoMessage['criticalAlertVolume'] = 1.0; // Max volume
            }
            
            // Add image URL to data for proper handling in the app
            if (!empty($notification['notification']['image'])) {
                $data['imageUrl'] = $notification['notification']['image'];
                // Also add to root level for iOS compatibility
                $expoMessage['_displayInForeground'] = true;
            }
            
            if (!empty($data)) {
                $expoMessage['data'] = $data;
            }

            // Add badge if present
            if (isset($notification['apns']['payload']['aps']['badge'])) {
                $expoMessage['badge'] = $notification['apns']['payload']['aps']['badge'];
            }

            // Add channel ID for Android (use critical-alerts-v2 channel for critical notifications)
            if ($isCritical) {
                $expoMessage['channelId'] = 'critical-alerts-v2';
            } elseif (!empty($notification['android']['notification']['channel_id'])) {
                $expoMessage['channelId'] = $notification['android']['notification']['channel_id'];
            } else {
                $expoMessage['channelId'] = 'default';
            }
            
            // iOS-specific settings for media attachments
            if (!empty($notification['notification']['image'])) {
                $expoMessage['mutableContent'] = true;
                $expoMessage['categoryId'] = 'image';
            }

            Log::info('📦 Expo message payload:', $expoMessage);
            Log::info('🚀 Sending to Expo Push Service...');

            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])->post(self::EXPO_PUSH_URL, $expoMessage);

            Log::info('📡 Expo Response Status: ' . $response->status());
            Log::info('📡 Expo Response Body: ' . $response->body());

            if ($response->successful()) {
                $responseData = $response->json();
                
                // Expo API returns: {"data": {"status": "ok", "id": "..."}} on success
                // or {"data": {"status": "error", "message": "...", "details": {...}}} on error
                $data = $responseData['data'] ?? [];
                
                if (isset($data['status']) && $data['status'] === 'ok') {
                    Log::info('✅ ========== EXPO NOTIFICATION SENT SUCCESSFULLY ==========');
                    Log::info('✅ Expo Receipt ID: ' . ($data['id'] ?? 'N/A'));
                    Log::info('✅ The notification should now appear on the device!');
                    
                    return [
                        'success' => true,
                        'message_id' => $data['id'] ?? null,
                        'details' => $data,
                    ];
                } else {
                    $errorMessage = $data['message'] ?? 'Unknown error';
                    $errorDetails = $data['details'] ?? [];
                    
                    Log::error('❌ ========== EXPO NOTIFICATION FAILED ==========');
                    Log::error('❌ Error Message: ' . $errorMessage);
                    Log::error('❌ Error Details: ' . json_encode($errorDetails));
                    
                    return [
                        'success' => false,
                        'error' => $errorMessage,
                        'details' => $errorDetails,
                    ];
                }
            }

            Log::error('❌ ========== EXPO API REQUEST FAILED ==========');
            Log::error('❌ Status Code: ' . $response->status());
            Log::error('❌ Response: ' . $response->body());

            return [
                'success' => false,
                'error' => 'Failed to send to Expo: ' . $response->body(),
            ];
        } catch (Exception $e) {
            Log::error('❌ ========== EXPO SEND EXCEPTION ==========');
            Log::error('❌ Exception: ' . $e->getMessage());
            Log::error('❌ File: ' . $e->getFile() . ' Line: ' . $e->getLine());
            
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Send notification to multiple Expo tokens (batch)
     */
    public function sendToMultipleTokens(array $tokens, array $notification): array
    {
        Log::info('📢 ========== BATCH EXPO NOTIFICATION ==========');
        Log::info('📢 Total Tokens: ' . count($tokens));
        
        try {
            // Check if this is a critical alert
            $data = $notification['data'] ?? [];
            $notificationType = $data['type'] ?? null;
            $isCritical = in_array($notificationType, ['alert', 'warning']);

            // Prepare batch messages for Expo
            $messages = [];
            foreach ($tokens as $token) {
                $expoMessage = [
                    'to' => $token,
                    'title' => $notification['notification']['title'] ?? '',
                    'body' => $notification['notification']['body'] ?? '',
                    'sound' => 'default',
                    'priority' => 'high',
                ];

                // Add critical alert properties for iOS
                if ($isCritical) {
                    $expoMessage['criticalAlert'] = true;
                    $expoMessage['criticalAlertVolume'] = 1.0;
                    $expoMessage['channelId'] = 'critical-alerts-v2'; // Android critical channel
                } else {
                    $expoMessage['channelId'] = 'default';
                }

                if (!empty($notification['data'])) {
                    $expoMessage['data'] = $notification['data'];
                }

                if (!empty($notification['notification']['image'])) {
                    $expoMessage['image'] = $notification['notification']['image'];
                }

                $messages[] = $expoMessage;
            }

            Log::info('🚀 Sending batch to Expo Push Service...');

            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])->post(self::EXPO_PUSH_URL, $messages);

            Log::info('📡 Expo Batch Response Status: ' . $response->status());

            if ($response->successful()) {
                $responseData = $response->json('data', []);
                $successCount = 0;
                $failureCount = 0;
                $results = [];

                foreach ($responseData as $index => $result) {
                    if (isset($result['status']) && $result['status'] === 'ok') {
                        $successCount++;
                        Log::info('✅ Token ' . ($index + 1) . ' - SUCCESS');
                    } else {
                        $failureCount++;
                        Log::error('❌ Token ' . ($index + 1) . ' - FAILED: ' . ($result['message'] ?? 'Unknown'));
                    }
                    
                    $results[] = [
                        'token' => $tokens[$index] ?? 'unknown',
                        'result' => $result,
                    ];
                }

                Log::info('📊 ========== BATCH SUMMARY ==========');
                Log::info('✅ Successful: ' . $successCount);
                Log::error('❌ Failed: ' . $failureCount);

                return [
                    'success_count' => $successCount,
                    'failure_count' => $failureCount,
                    'results' => $results,
                ];
            }

            Log::error('❌ Expo batch request failed: ' . $response->body());

            return [
                'success_count' => 0,
                'failure_count' => count($tokens),
                'results' => [],
                'error' => 'Expo batch request failed',
            ];
        } catch (Exception $e) {
            Log::error('❌ Expo batch send exception: ' . $e->getMessage());
            
            return [
                'success_count' => 0,
                'failure_count' => count($tokens),
                'results' => [],
                'error' => $e->getMessage(),
            ];
        }
    }
}

