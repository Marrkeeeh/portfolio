<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class ProfileController extends Controller
{
    /**
     * Get user profile
     */
    public function show(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'fname' => $user->fname,
                    'mname' => $user->mname,
                    'lname' => $user->lname,
                    'full_name' => $user->full_name,
                    'username' => $user->username,
                    'email' => $user->email,
                    'role' => $user->role,
                    'phonenumber' => $user->phonenumber,
                    'address' => $user->address,
                    'profile_img' => $user->profile_img,
                    'two_factor_enabled' => $user->hasEnabledTwoFactorAuthentication(),
                    'created_at' => $user->created_at,
                    'updated_at' => $user->updated_at,
                ],
            ],
        ], 200);
    }

    /**
     * Update user profile
     */
    public function update(Request $request)
    {
        return response()->json([
            'success' => false,
            'message' => 'Validation failed',
        ], 422);
    }

    /**
     * Upload profile image
     */
    public function uploadAvatar(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'profile_img' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        // Delete old profile image if exists (from both legacy storage and public/uploads paths)
        if ($user->profile_img) {
            // Legacy storage-based path (e.g. "profiles/...")
            Storage::disk('public')->delete($user->profile_img);

            // Public uploads path (e.g. "uploads/profiles/...")
            $oldPath = public_path($user->profile_img);
            if (file_exists($oldPath)) {
                @unlink($oldPath);
            }
        }

        $file = $request->file('profile_img');

        // Store new profile image under public/uploads/profiles
        $uploadDir = 'uploads/profiles';
        $filename = time() . '_' . $file->getClientOriginalName();
        $destination = public_path($uploadDir);

        if (!is_dir($destination)) {
            mkdir($destination, 0755, true);
        }

        $file->move($destination, $filename);

        $relativePath = $uploadDir . '/' . $filename;

        $user->profile_img = $relativePath;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Profile image uploaded successfully',
            'data' => [
                // Full URL to the uploaded image
                'profile_img' => asset($relativePath),
            ],
        ], 200);
    }
}
