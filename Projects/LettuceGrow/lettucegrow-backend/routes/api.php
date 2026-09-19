<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DeviceController;
use App\Http\Controllers\Api\DeviceShareController;
use App\Http\Controllers\Api\IoTDeviceController;
use App\Http\Controllers\Api\PlantController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\SupplyController;
use App\Http\Controllers\Api\TwoFactorAuthController;
use App\Http\Controllers\Api\PushNotificationController;
use App\Http\Controllers\Api\SensorDataEvaluationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public IoT device route (ESP32 polling)
Route::post('/esp32/data', [IoTDeviceController::class, 'ingest']);

// Push Notification routes
Route::prefix('push-notifications')->group(function () {
    // Public routes (device registration)
    Route::post('/register', [PushNotificationController::class, 'register']);
    Route::post('/unregister', [PushNotificationController::class, 'unregister']);

    // Authenticated user routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/my-notifications', [PushNotificationController::class, 'getMyNotifications']);
        Route::post('/mark-all-as-read', [PushNotificationController::class, 'markAllAsRead']);
        Route::post('/{id}/mark-as-read', [PushNotificationController::class, 'markAsRead']);
        Route::delete('/{id}', [PushNotificationController::class, 'delete']);
    });
});

// Public authentication routes
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Authentication routes
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/verify-email', [AuthController::class, 'verifyEmail']);
        Route::post('/resend-activation-otp', [AuthController::class, 'resendActivationOtp']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
    });

    // Profile routes
    Route::prefix('profile')->group(function () {
        Route::get('/', [ProfileController::class, 'show']);
        Route::put('/', [ProfileController::class, 'update']);
        Route::post('/upload-avatar', [ProfileController::class, 'uploadAvatar']);
    });

    // Two-Factor Authentication routes
    Route::prefix('2fa')->group(function () {
        Route::post('/enable', [TwoFactorAuthController::class, 'enable']);
        Route::post('/disable', [TwoFactorAuthController::class, 'disable']);
        Route::post('/verify', [TwoFactorAuthController::class, 'verify']);
        Route::get('/qr-code', [TwoFactorAuthController::class, 'getQrCode']);
        Route::post('/recovery-codes', [TwoFactorAuthController::class, 'getRecoveryCodes']);
        Route::post('/confirm', [TwoFactorAuthController::class, 'confirm']);
    });

    // Device routes
    Route::prefix('devices')->group(function () {
        Route::get('/', [DeviceController::class, 'index']);
        Route::post('/claim', [DeviceController::class, 'claim']);
        // Specific routes must come before the generic {device} route
        Route::get('/{device}/sensor-history', [DeviceController::class, 'sensorHistory']);
        Route::get('/{device}/control-history', [DeviceController::class, 'controlHistory']);
        Route::get('/{device}/sensor-evaluation', [SensorDataEvaluationController::class, 'show']);
        Route::put('/{device}/sensor-evaluation', [SensorDataEvaluationController::class, 'update']);
        
        // Device sharing routes
        Route::prefix('{device}/shares')->group(function () {
            Route::get('/', [DeviceShareController::class, 'list']);
            Route::get('/search-users', [DeviceShareController::class, 'searchUsers']);
            Route::post('/', [DeviceShareController::class, 'share']);
            Route::delete('/{userId}', [DeviceShareController::class, 'unshare']);
        });
        
        // Generic device routes
        Route::get('/{device}', [DeviceController::class, 'show']);
        Route::put('/{device}', [DeviceController::class, 'update']);
        Route::delete('/{device}', [DeviceController::class, 'destroy']);
    });

    // Supplies routes
    Route::prefix('supplies')->group(function () {
        Route::get('/', [SupplyController::class, 'index']);
        Route::get('/history', [SupplyController::class, 'history']);
        Route::put('/{supply}', [SupplyController::class, 'update']);
    });

    // Plants routes
    Route::prefix('plants')->group(function () {
        // Global plant routes (across all accessible devices)
        Route::get('/', [PlantController::class, 'index']);
        Route::get('/harvests', [PlantController::class, 'allHarvestHistory']);
    });

    // Device-specific plant routes
    Route::prefix('devices/{device}/plants')->group(function () {
        Route::get('/', [PlantController::class, 'listByDevice']);
        Route::post('/', [PlantController::class, 'store']);
        Route::get('/harvests', [PlantController::class, 'harvestHistory']);
        Route::get('/{plant}', [PlantController::class, 'show']);
        Route::put('/{plant}', [PlantController::class, 'update']);
        Route::delete('/{plant}', [PlantController::class, 'destroy']);
        Route::post('/{plant}/harvest', [PlantController::class, 'harvest']);
        Route::post('/{plant}/retire', [PlantController::class, 'retire']);
    });
});
