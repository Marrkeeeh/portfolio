<?php

namespace App\Services\Notification\Services\Firebase;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Google\Auth\Credentials\ServiceAccountCredentials;

class FirebaseCloudMessagingService
{
    private const FCM_ENDPOINT = 'https://fcm.googleapis.com/v1/projects/%s/messages:send';
    private const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging'];

    private ?string $accessToken = null;
    private ?int $tokenExpiry = null;

    /**
     * Get OAuth2 access token from service account
     */
    private function getAccessToken(): string
    {
        // Return cached token if still valid
        if ($this->accessToken && $this->tokenExpiry > time()) {
            Log::info('✅ Using cached Firebase access token');
            return $this->accessToken;
        }

        try {
            $credentialsPath = config('services.firebase.credentials');
            $fullPath = storage_path($credentialsPath);
            
            Log::info('🔑 Attempting to get Firebase access token');
            Log::info('📁 Credentials path: ' . $fullPath);
            
            if (!file_exists($fullPath)) {
                Log::error('❌ Firebase credentials file NOT found at: ' . $fullPath);
                throw new Exception("Firebase credentials file not found at: " . $fullPath);
            }
            
            Log::info('✅ Credentials file found');

            $credentials = new ServiceAccountCredentials(
                self::SCOPES,
                $fullPath
            );

            Log::info('🔐 Fetching OAuth2 token from Google...');
            $authToken = $credentials->fetchAuthToken();

            if (!isset($authToken['access_token'])) {
                Log::error('❌ Failed to get access token from response');
                throw new Exception('Failed to fetch access token from service account');
            }

            $this->accessToken = $authToken['access_token'];
            $this->tokenExpiry = time() + ($authToken['expires_in'] ?? 3600) - 300; // 5 min buffer

            Log::info('✅ Firebase access token obtained successfully');
            Log::info('⏰ Token expires in: ' . ($authToken['expires_in'] ?? 3600) . ' seconds');

            return $this->accessToken;
        } catch (Exception $e) {
            Log::error('❌ Firebase access token error: ' . $e->getMessage());
            throw new Exception('Failed to get Firebase access token: ' . $e->getMessage());
        }
    }

    /**
     * Send notification to a single device token
     */
    public function sendToToken(string $token, array $notification): array
    {
        try {
            Log::info('📱 ========== SENDING PUSH NOTIFICATION ==========');
            Log::info('📱 Device Token (first 50 chars): ' . substr($token, 0, 50) . '...');
            Log::info('📱 Notification Title: ' . ($notification['notification']['title'] ?? 'N/A'));
            Log::info('📱 Notification Body: ' . ($notification['notification']['body'] ?? 'N/A'));
            
            $accessToken = $this->getAccessToken();
            $projectId = config('services.firebase.project_id');

            Log::info('🎯 Firebase Project ID: ' . $projectId);

            $url = sprintf(self::FCM_ENDPOINT, $projectId);
            Log::info('🌐 FCM Endpoint: ' . $url);

            // Check if this is a critical alert
            $data = $notification['data'] ?? [];
            $notificationType = $data['type'] ?? null;
            $isCritical = in_array($notificationType, ['alert', 'warning']);

            // Override channel ID for critical notifications
            if ($isCritical && isset($notification['android'])) {
                $notification['android']['notification']['channel_id'] = 'critical-alerts-v2';
                // Set high priority for critical alerts
                $notification['android']['priority'] = 'high';
            } elseif (isset($notification['android']) && empty($notification['android']['notification']['channel_id'])) {
                $notification['android']['notification']['channel_id'] = 'default';
            }

            $message = [
                'message' => [
                    'token' => $token,
                    ...$notification,
                ],
            ];

            if ($isCritical) {
                Log::info('🚨 CRITICAL ALERT - Using critical-alerts channel');
            }

            Log::info('📦 Message payload prepared');
            Log::info('🚀 Sending to Firebase FCM...');

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $accessToken,
                'Content-Type' => 'application/json',
            ])->post($url, $message);

            Log::info('📡 FCM Response Status: ' . $response->status());

            if ($response->successful()) {
                $messageId = $response->json('name');
                Log::info('✅ ========== NOTIFICATION SENT SUCCESSFULLY ==========');
                Log::info('✅ FCM Message ID: ' . $messageId);
                Log::info('✅ The notification should now appear on the device!');
                
                return [
                    'success' => true,
                    'message_id' => $messageId,
                ];
            }

            $errorMessage = $response->json('error.message', 'Unknown error');
            $errorCode = $response->json('error.code', 'UNKNOWN');
            $errorDetails = $response->json('error.details', []);
            
            Log::error('❌ ========== NOTIFICATION FAILED ==========');
            Log::error('❌ Error Code: ' . $errorCode);
            Log::error('❌ Error Message: ' . $errorMessage);
            
            // Check if error is due to invalid FCM token
            $isInvalidToken = str_contains($errorMessage, 'not a valid FCM registration token') || 
                            str_contains($errorMessage, 'invalid registration token');
            
            return [
                'success' => false,
                'error' => $errorMessage,
                'code' => $errorCode,
                'is_invalid_token' => $isInvalidToken, // Flag for fallback
            ];
        } catch (Exception $e) {
            Log::error('❌ ========== FCM SEND EXCEPTION ==========');
            Log::error('❌ Exception: ' . $e->getMessage());
            Log::error('❌ File: ' . $e->getFile() . ' Line: ' . $e->getLine());
            
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Send notification to multiple device tokens (batch)
     */
    public function sendToMultipleTokens(array $tokens, array $notification): array
    {
        Log::info('📢 ========== BATCH NOTIFICATION ==========');
        Log::info('📢 Total Tokens: ' . count($tokens));
        
        $results = [
            'success_count' => 0,
            'failure_count' => 0,
            'results' => [],
        ];

        foreach ($tokens as $index => $token) {
            Log::info('📱 Sending to device ' . ($index + 1) . '/' . count($tokens));
            
            $result = $this->sendToToken($token, $notification);
            
            if ($result['success']) {
                $results['success_count']++;
                Log::info('✅ Device ' . ($index + 1) . ' - SUCCESS');
            } else {
                $results['failure_count']++;
                Log::error('❌ Device ' . ($index + 1) . ' - FAILED: ' . ($result['error'] ?? 'Unknown'));
            }

            $results['results'][] = [
                'token' => $token,
                'result' => $result,
            ];
        }

        Log::info('📊 ========== BATCH SUMMARY ==========');
        Log::info('✅ Successful: ' . $results['success_count']);
        Log::error('❌ Failed: ' . $results['failure_count']);

        return $results;
    }

    /**
     * Send notification to a topic
     */
    public function sendToTopic(string $topic, array $notification): array
    {
        try {
            $accessToken = $this->getAccessToken();
            $projectId = config('services.firebase.project_id');

            $url = sprintf(self::FCM_ENDPOINT, $projectId);

            $message = [
                'message' => [
                    'topic' => $topic,
                    ...$notification,
                ],
            ];

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $accessToken,
                'Content-Type' => 'application/json',
            ])->post($url, $message);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message_id' => $response->json('name'),
                ];
            }

            return [
                'success' => false,
                'error' => $response->json('error.message', 'Unknown error'),
            ];
        } catch (Exception $e) {
            Log::error('FCM topic send error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Subscribe tokens to a topic
     */
    public function subscribeToTopic(array $tokens, string $topic): array
    {
        try {
            $accessToken = $this->getAccessToken();

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $accessToken,
                'Content-Type' => 'application/json',
            ])->post('https://iid.googleapis.com/iid/v1:batchAdd', [
                'to' => '/topics/' . $topic,
                'registration_tokens' => $tokens,
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'results' => $response->json('results', []),
                ];
            }

            return [
                'success' => false,
                'error' => $response->json('error', 'Unknown error'),
            ];
        } catch (Exception $e) {
            Log::error('FCM topic subscription error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Unsubscribe tokens from a topic
     */
    public function unsubscribeFromTopic(array $tokens, string $topic): array
    {
        try {
            $accessToken = $this->getAccessToken();

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $accessToken,
                'Content-Type' => 'application/json',
            ])->post('https://iid.googleapis.com/iid/v1:batchRemove', [
                'to' => '/topics/' . $topic,
                'registration_tokens' => $tokens,
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'results' => $response->json('results', []),
                ];
            }

            return [
                'success' => false,
                'error' => $response->json('error', 'Unknown error'),
            ];
        } catch (Exception $e) {
            Log::error('FCM topic unsubscription error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
}

