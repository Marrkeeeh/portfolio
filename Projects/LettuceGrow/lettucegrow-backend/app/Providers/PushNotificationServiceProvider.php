<?php

namespace App\Providers;

use App\Repositories\DeviceTokenRepository;
use App\Repositories\PushNotificationRepository;
use App\Services\Notification\Services\Expo\ExpoPushNotificationService;
use App\Services\Notification\Services\Firebase\FirebaseCloudMessagingService;
use App\Services\Notification\PushNotificationService;
use Illuminate\Support\ServiceProvider;

class PushNotificationServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        // Register repositories
        $this->app->singleton(DeviceTokenRepository::class, function ($app) {
            return new DeviceTokenRepository();
        });

        $this->app->singleton(PushNotificationRepository::class, function ($app) {
            return new PushNotificationRepository();
        });

        // Register Firebase service
        $this->app->singleton(FirebaseCloudMessagingService::class, function ($app) {
            return new FirebaseCloudMessagingService();
        });

        // Register Expo service
        $this->app->singleton(ExpoPushNotificationService::class, function ($app) {
            return new ExpoPushNotificationService();
        });

        // Register main push notification service
        $this->app->singleton(PushNotificationService::class, function ($app) {
            return new PushNotificationService(
                $app->make(DeviceTokenRepository::class),
                $app->make(PushNotificationRepository::class),
                $app->make(FirebaseCloudMessagingService::class),
                $app->make(ExpoPushNotificationService::class)
            );
        });
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Load configuration
        $this->mergeConfigFrom(
            __DIR__.'/../../config/push-notification.php', 'push-notification'
        );

        // Publish configuration
        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__.'/../../config/push-notification.php' => config_path('push-notification.php'),
            ], 'push-notification-config');
        }
    }
}

