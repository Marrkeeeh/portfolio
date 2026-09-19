<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\EmailActivationMail;
use App\Mail\ForgotPasswordMail;
use App\Models\Otp;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new user
     */
    public function register(Request $request)
    {
        // Prepare data - convert empty strings to null for nullable fields
        $data = $request->all();
        if (isset($data['mname']) && $data['mname'] === '') {
            $data['mname'] = null;
        }
        if (isset($data['phonenumber']) && $data['phonenumber'] === '') {
            $data['phonenumber'] = null;
        }
        if (isset($data['address']) && $data['address'] === '') {
            $data['address'] = null;
        }

        $validator = Validator::make($data, [
            'fname' => 'required|string|max:100',
            'mname' => 'nullable|string|max:100',
            'lname' => 'required|string|max:100',
            'username' => 'required|string|max:50|unique:users,username',
            'email' => 'required|email|max:100|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'phonenumber' => 'nullable|string|max:20',
            'address' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::create([
            'fname' => $data['fname'],
            'mname' => $data['mname'] ?? null,
            'lname' => $data['lname'],
            'username' => $data['username'],
            'email' => $data['email'] ?? null,
            'password' => Hash::make($data['password']),
            'phonenumber' => $data['phonenumber'] ?? null,
            'address' => $data['address'] ?? null,
            'role' => 'user',
        ]);

        // Generate and send email activation OTP
        $this->generateAndSendOtp($user, 'email_activation');

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'User registered successfully. Please check your email for the activation code.',
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
                    'email_verified' => $user->email_verified_at !== null,
                ],
                'token' => $token,
                'requires_email_verification' => true,
            ],
        ], 201);
    }

    /**
     * Login user
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Try to find user by username or email
        $user = User::where('username', $request->username)
            ->orWhere('email', $request->username)
            ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials',
            ], 401);
        }

        // Check if 2FA is enabled
        $requires2FA = $user->hasEnabledTwoFactorAuthentication();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
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
                    'two_factor_enabled' => $requires2FA,
                ],
                'token' => $token,
                'requires_2fa' => $requires2FA,
            ],
        ], 200);
    }

    /**
     * Change the authenticated user's password
     */
    public function changePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'current_password' => ['required', 'current_password'],
            'password' => ['required', PasswordRule::defaults(), 'confirmed'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        $user->password = Hash::make($request->password);
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Password updated successfully',
        ], 200);
    }

    /**
     * Logout user
     */
    public function logout(Request $request)
    {
        $request->user()->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ], 200);
    }

    /**
     * Get authenticated user
     */
    public function me(Request $request)
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
                ],
            ],
        ], 200);
    }

    /**
     * Request password reset (sends OTP)
     */
    public function forgotPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            // Email does not exist
            return response()->json([
                'success' => false,
                'message' => 'The email address you entered does not exist in our system. Please check and try again.',
                'error' => 'Email not found',
            ], 404);
        }

        // Generate and send OTP
        try {
            $this->generateAndSendOtp($user, 'password_reset');
            Log::info('Password reset OTP sent successfully to: ' . $user->email);
        } catch (\Exception $e) {
            Log::error('Failed to send password reset email to ' . $user->email . ': ' . $e->getMessage());
            Log::error('Exception trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Unable to send password reset OTP. Please check your email configuration or try again later.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Password reset OTP has been sent to your email',
        ], 200);
    }

    /**
     * Reset password (verifies OTP first)
     */
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'otp_code' => 'required|string|size:6',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or OTP code',
            ], 400);
        }

        // Find and verify OTP
        $otp = Otp::where('user_id', $user->id)
            ->where('code', $request->otp_code)
            ->where('type', 'password_reset')
            ->valid()
            ->latest()
            ->first();

        if (!$otp) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired OTP code',
            ], 400);
        }

        // Mark OTP as used and reset password
        $otp->markAsUsed();
        $user->password = Hash::make($request->password);
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Password reset successfully',
        ], 200);
    }

    /**
     * Verify email with OTP
     */
    public function verifyEmail(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'otp_code' => 'required|string|size:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        // Check if user has an email address
        if (!$user->email) {
            return response()->json([
                'success' => false,
                'message' => 'No email address associated with this account',
            ], 400);
        }

        if ($user->email_verified_at) {
            return response()->json([
                'success' => false,
                'message' => 'Email is already verified',
            ], 400);
        }

        // Find and verify OTP
        $otp = Otp::where('user_id', $user->id)
            ->where('code', $request->otp_code)
            ->where('type', 'email_activation')
            ->valid()
            ->latest()
            ->first();

        if (!$otp) {
            // Check if there's an expired OTP
            $expiredOtp = Otp::where('user_id', $user->id)
                ->where('code', $request->otp_code)
                ->where('type', 'email_activation')
                ->latest()
                ->first();

            if ($expiredOtp && $expiredOtp->expires_at && $expiredOtp->expires_at->isPast()) {
                return response()->json([
                    'success' => false,
                    'message' => 'OTP code has expired. Please request a new one.',
                ], 400);
            }

            if ($expiredOtp && $expiredOtp->used) {
                return response()->json([
                    'success' => false,
                    'message' => 'This OTP code has already been used. Please request a new one.',
                ], 400);
            }

            return response()->json([
                'success' => false,
                'message' => 'Invalid OTP code. Please check and try again.',
            ], 400);
        }

        // Mark OTP as used and verify email
        $otp->markAsUsed();
        $user->email_verified_at = now();
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Email verified successfully',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'email_verified' => true,
                ],
            ],
        ], 200);
    }

    /**
     * Resend email activation OTP
     */
    public function resendActivationOtp(Request $request)
    {
        $user = $request->user();

        if ($user->email_verified_at) {
            return response()->json([
                'success' => false,
                'message' => 'Email is already verified',
            ], 400);
        }

        if (!$user->email) {
            return response()->json([
                'success' => false,
                'message' => 'No email address associated with this account',
            ], 400);
        }

        // Generate and send new OTP
        try {
            $this->generateAndSendOtp($user, 'email_activation');
        } catch (\Exception $e) {
            Log::error('Failed to send activation email: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Unable to send activation OTP',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Activation OTP has been sent to your email',
        ], 200);
    }

    /**
     * Generate OTP code and send email
     */
    private function generateAndSendOtp(User $user, string $type): string
    {
        // Generate 6-digit OTP code
        $otpCode = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $otpExpiresAt = now()->addMinutes(15);

        // Create OTP record first (before sending email)
        $otp = Otp::create([
            'user_id' => $user->id,
            'code' => $otpCode,
            'type' => $type,
            'expires_at' => $otpExpiresAt,
        ]);

        Log::info("OTP created for user {$user->id}, type: {$type}, code: {$otpCode}");

        // Send email based on type
        try {
            if ($type === 'email_activation') {
                Mail::to($user->email)->send(new EmailActivationMail($user, $otpCode));
                Log::info("Email activation mail sent to: {$user->email}");
            } elseif ($type === 'password_reset') {
                Mail::to($user->email)->send(new ForgotPasswordMail($user, $otpCode));
                Log::info("Password reset mail sent to: {$user->email}");
            }
        } catch (\Exception $e) {
            // Log the mail error but don't fail completely - OTP is already created
            Log::error("Failed to send {$type} email to {$user->email}: " . $e->getMessage());
            // Re-throw so the calling method can handle it
            throw $e;
        }

        return $otpCode;
    }
}

