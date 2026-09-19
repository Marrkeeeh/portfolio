<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeviceShare;
use App\Models\SmartDevice;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeviceShareController extends Controller
{
    /**
     * Share a device with another user.
     */
    public function share(Request $request, $deviceId)
    {
        $user = $request->user();
        
        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $device = SmartDevice::findOrFail($deviceId);

        // Check if user owns the device
        if ($device->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'error' => 'You do not have permission to share this device.',
            ], 403);
        }

        $sharedWithUserId = $validated['user_id'];

        // Cannot share with yourself
        if ($sharedWithUserId === $user->id) {
            return response()->json([
                'success' => false,
                'error' => 'You cannot share a device with yourself.',
            ], 400);
        }

        // Cannot share with the device owner
        if ($sharedWithUserId === $device->user_id) {
            return response()->json([
                'success' => false,
                'error' => 'This user already owns the device.',
            ], 400);
        }

        // Check if already shared
        $existingShare = DeviceShare::where('device_id', $deviceId)
            ->where('shared_with_user_id', $sharedWithUserId)
            ->first();

        if ($existingShare) {
            return response()->json([
                'success' => false,
                'error' => 'This device is already shared with this user.',
            ], 409);
        }

        // Create the share
        $share = DeviceShare::create([
            'device_id' => $deviceId,
            'shared_with_user_id' => $sharedWithUserId,
            'shared_by_user_id' => $user->id,
        ]);

        $sharedUser = User::find($sharedWithUserId);

        return response()->json([
            'success' => true,
            'message' => 'Device shared successfully.',
            'data' => [
                'share' => [
                    'id' => $share->id,
                    'device_id' => $share->device_id,
                    'shared_with_user' => [
                        'id' => $sharedUser->id,
                        'name' => $sharedUser->name,
                        'username' => $sharedUser->username,
                        'email' => $sharedUser->email,
                    ],
                    'shared_at' => $share->created_at->toISOString(),
                ],
            ],
        ]);
    }

    /**
     * Unshare a device from a user.
     */
    public function unshare(Request $request, $deviceId, $userId)
    {
        $user = $request->user();
        
        $device = SmartDevice::findOrFail($deviceId);

        // Check if user owns the device
        if ($device->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'error' => 'You do not have permission to unshare this device.',
            ], 403);
        }

        $share = DeviceShare::where('device_id', $deviceId)
            ->where('shared_with_user_id', $userId)
            ->first();

        if (!$share) {
            return response()->json([
                'success' => false,
                'error' => 'This device is not shared with this user.',
            ], 404);
        }

        $share->delete();

        return response()->json([
            'success' => true,
            'message' => 'Device unshared successfully.',
        ]);
    }

    /**
     * List all users a device is shared with.
     */
    public function list(Request $request, $deviceId)
    {
        $user = $request->user();
        
        $device = SmartDevice::findOrFail($deviceId);

        // Check if user owns the device
        if ($device->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'error' => 'You do not have permission to view shares for this device.',
            ], 403);
        }

        $shares = DeviceShare::where('device_id', $deviceId)
            ->with('sharedWithUser:id,fname,mname,lname,username,email,profile_img')
            ->orderBy('created_at', 'desc')
            ->get();

        $sharedUsers = $shares->map(function ($share) {
            return [
                'id' => $share->sharedWithUser->id,
                'name' => $share->sharedWithUser->name,
                'username' => $share->sharedWithUser->username,
                'email' => $share->sharedWithUser->email,
                'profile_img' => $share->sharedWithUser->profile_img,
                'shared_at' => $share->created_at->toISOString(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'shared_users' => $sharedUsers,
            ],
        ]);
    }

    /**
     * Search for users to share with (exclude device owner and already shared users).
     */
    public function searchUsers(Request $request, $deviceId)
    {
        $user = $request->user();
        
        $device = SmartDevice::findOrFail($deviceId);

        // Check if user owns the device
        if ($device->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'error' => 'You do not have permission to search users for this device.',
            ], 403);
        }

        $query = $request->input('q', '');
        
        if (empty($query) || strlen($query) < 2) {
            return response()->json([
                'success' => true,
                'data' => [
                    'users' => [],
                ],
            ]);
        }

        // Get IDs of users already shared with
        $sharedUserIds = DeviceShare::where('device_id', $deviceId)
            ->pluck('shared_with_user_id')
            ->toArray();

        // Search users (exclude owner, self, and already shared users)
        $users = User::where(function ($q) use ($query) {
                $q->where('username', 'like', "%{$query}%")
                  ->orWhere('email', 'like', "%{$query}%")
                  ->orWhere('fname', 'like', "%{$query}%")
                  ->orWhere('lname', 'like', "%{$query}%");
            })
            ->where('id', '!=', $user->id)
            ->where('id', '!=', $device->user_id)
            ->whereNotIn('id', $sharedUserIds)
            ->select('id', 'fname', 'mname', 'lname', 'username', 'email', 'profile_img')
            ->limit(10)
            ->get();

        $userList = $users->map(function ($u) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'username' => $u->username,
                'email' => $u->email,
                'profile_img' => $u->profile_img,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'users' => $userList,
            ],
        ]);
    }
}
