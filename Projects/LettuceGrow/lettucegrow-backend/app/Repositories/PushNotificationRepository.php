<?php

namespace App\Repositories;

use App\Models\PushNotification;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class PushNotificationRepository
{
    /**
     * Create a new notification record
     */
    public function create(array $data): PushNotification
    {
        return PushNotification::create($data);
    }

    /**
     * Get notifications by user ID
     */
    public function getByUserId(int $userId, int $perPage = 15): LengthAwarePaginator
    {
        return PushNotification::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get all notifications
     */
    public function getAll(int $perPage = 15): LengthAwarePaginator
    {
        return PushNotification::orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get pending notifications
     */
    public function getPending(): Collection
    {
        return PushNotification::pending()->get();
    }

    /**
     * Find notification by ID
     */
    public function findById(int $id): ?PushNotification
    {
        return PushNotification::find($id);
    }

    /**
     * Update notification status to sent
     */
    public function markAsSent(int $id, int $successCount, int $failureCount): bool
    {
        $notification = $this->findById($id);
        if ($notification) {
            $notification->markAsSent($successCount, $failureCount);
            return true;
        }
        return false;
    }

    /**
     * Update notification status to failed
     */
    public function markAsFailed(int $id, string $errorMessage): bool
    {
        $notification = $this->findById($id);
        if ($notification) {
            $notification->markAsFailed($errorMessage);
            return true;
        }
        return false;
    }

    /**
     * Get notification statistics
     */
    public function getStatistics(): array
    {
        return [
            'total' => PushNotification::count(),
            'sent' => PushNotification::sent()->count(),
            'pending' => PushNotification::pending()->count(),
            'failed' => PushNotification::failed()->count(),
            'total_success' => PushNotification::sent()->sum('success_count'),
            'total_failure' => PushNotification::sent()->sum('failure_count'),
        ];
    }

    /**
     * Delete old notifications
     */
    public function deleteOldNotifications(int $days = 90): int
    {
        return PushNotification::where('created_at', '<', now()->subDays($days))
            ->delete();
    }

    /**
     * Get notification history
     */
    public function getHistory(int $limit = 20): array
    {
        return PushNotification::orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    /**
     * Delete a notification
     */
    public function delete(int $id): bool
    {
        $notification = $this->findById($id);
        if ($notification) {
            return $notification->delete();
        }
        return false;
    }

    /**
     * Delete multiple notifications
     */
    public function deleteMultiple(array $ids): int
    {
        return PushNotification::whereIn('id', $ids)->delete();
    }

    /**
     * Delete all notifications
     */
    public function deleteAll(): int
    {
        return PushNotification::query()->delete();
    }

    /**
     * Get user's notification history with pagination
     */
    public function getUserHistoryPaginated(int $userId, int $page = 1, int $limit = 5): array
    {
        $query = PushNotification::where('user_id', $userId)
            ->orderBy('created_at', 'desc');

        $total = $query->count();
        $totalPages = (int) ceil($total / $limit);
        $offset = ($page - 1) * $limit;

        $data = $query->skip($offset)
            ->take($limit)
            ->get()
            ->toArray();

        // Get unread count for the user
        $unreadCount = PushNotification::where('user_id', $userId)
            ->whereNull('read_at')
            ->count();

        return [
            'data' => $data,
            'current_page' => $page,
            'per_page' => $limit,
            'total' => $total,
            'total_pages' => $totalPages,
            'has_more' => $page < $totalPages,
            'unread_count' => $unreadCount,
        ];
    }

    /**
     * Mark a notification as read
     */
    public function markAsRead(int $id): bool
    {
        $notification = $this->findById($id);
        if ($notification) {
            $notification->read_at = now();
            return $notification->save();
        }
        return false;
    }

    /**
     * Mark all notifications as read (optionally for a specific user)
     */
    public function markAllAsRead(?int $userId = null): int
    {
        $query = PushNotification::whereNull('read_at');
        
        if ($userId !== null) {
            $query->where('user_id', $userId);
        }
        
        return $query->update(['read_at' => now()]);
    }
}

