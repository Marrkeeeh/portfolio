<?php

namespace App\Http\Controllers\Api;

use App\DTOs\DeviceTokenDTO;
use App\DTOs\NotificationDTO;
use App\Http\Controllers\Controller;
use App\Services\Notification\PushNotificationService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use App\Models\PushNotification;

class PushNotificationController extends Controller
{
    public function __construct(
        private readonly PushNotificationService $pushNotificationService,
    ) {
    }

    /**
     * Register device token.
     */
    public function register(Request $request): JsonResponse
    {
        Log::info('Push notification registration request', [
            'data' => $request->all(),
        ]);

        $validator = Validator::make($request->all(), [
            'expoToken' => 'required|string',
            'deviceToken' => 'required|string',
            'platform' => 'required|in:android,ios,web',
            'deviceId' => 'nullable|string',
            'deviceName' => 'nullable|string',
            'userId' => 'nullable|integer|exists:users,id',
        ]);

        if ($validator->fails()) {
            Log::error('Push notification registration validation failed', [
                'errors' => $validator->errors()->toArray(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $dto = DeviceTokenDTO::fromRequest($request->all());
            $token = $this->pushNotificationService->registerDeviceToken($dto);

            return response()->json([
                'success' => true,
                'message' => 'Device token registered successfully',
                'data' => [
                    'id' => $token->id,
                    'expo_token' => $token->expo_token,
                    'platform' => $token->platform,
                    'user_id' => $token->user_id,
                ],
            ], 201);
        } catch (Exception $e) {
            Log::error('Push notification registration error', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Unregister device token.
     */
    public function unregister(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'expoToken' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $result = $this->pushNotificationService->unregisterDeviceToken(
                $request->input('expoToken'),
            );

            if ($result) {
                return response()->json([
                    'success' => true,
                    'message' => 'Device token unregistered successfully',
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Device token not found',
            ], 404);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get authenticated user's notification history with pagination.
     */
    public function getMyNotifications(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (! $user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated',
                ], 401);
            }

            $page = (int) $request->query('page', 1);
            $limit = (int) $request->query('limit', 10);

            $result = $this->pushNotificationService->getUserNotificationHistory(
                $user->id,
                $page,
                $limit,
            );

            return response()->json([
                'success' => true,
                'data' => $result['data'],
                'pagination' => [
                    'current_page' => $result['current_page'],
                    'total_pages' => $result['total_pages'],
                    'per_page' => $result['per_page'],
                    'total' => $result['total'],
                    'has_more' => $result['has_more'],
                ],
                'unread_count' => $result['unread_count'] ?? 0,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Mark a notification as read.
     */
    public function markAsRead(int $id): JsonResponse
    {
        try {
            $result = $this->pushNotificationService->markNotificationAsRead($id);

            if ($result) {
                return response()->json([
                    'success' => true,
                    'message' => 'Notification marked as read successfully',
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Notification not found',
            ], 404);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Mark all notifications as read for the authenticated user.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (! $user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated',
                ], 401);
            }

            $count = $this->pushNotificationService->markAllNotificationsAsRead($user->id);

            return response()->json([
                'success' => true,
                'message' => "Marked {$count} notification(s) as read successfully",
                'data' => ['marked_count' => $count],
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a single notification owned by the authenticated user.
     */
    public function delete(Request $request, int $id): JsonResponse
    {
        try {
            $user = $request->user();

            if (! $user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated',
                ], 401);
            }

            $notification = PushNotification::where('id', $id)
                ->where('user_id', $user->id)
                ->first();

            if (! $notification) {
                return response()->json([
                    'success' => false,
                    'message' => 'Notification not found',
                ], 404);
            }

            $this->pushNotificationService->deleteNotification($id);

            return response()->json([
                'success' => true,
                'message' => 'Notification deleted successfully',
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
