<?php

use App\Http\Controllers\Api\ActionController;
use App\Http\Controllers\Api\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Admin\ResourcesController as AdminResourcesController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\DiscoverController;
use App\Http\Controllers\Api\PhotoController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\SafetyController;
use App\Http\Controllers\Api\VerificationController;
use App\Http\Controllers\TelegramWebhookController;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsureUserActive;
use Illuminate\Support\Facades\Route;

Route::post('/auth/telegram', [AuthController::class, 'telegram'])->middleware('throttle:20,1');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:20,1');
Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/telegram/webhook', TelegramWebhookController::class);

// Public photo proxy — survives ephemeral /storage 404s via CDN redirect / Telegram re-fetch
Route::get('/media/photos/{photo}', [\App\Http\Controllers\Api\MediaController::class, 'photo'])
    ->middleware('throttle:180,1');

Route::prefix('admin')->group(function () {
    Route::post('/login', [AdminAuthController::class, 'login'])->middleware('throttle:20,1');

    Route::middleware(['auth:sanctum', EnsureAdmin::class, 'throttle:120,1'])->group(function () {
        Route::get('/me', [AdminAuthController::class, 'me']);
        Route::post('/logout', [AdminAuthController::class, 'logout']);

        Route::get('/stats', [AdminDashboardController::class, 'stats']);
        Route::get('/map', [AdminDashboardController::class, 'map']);
        Route::get('/locations', [AdminDashboardController::class, 'locations']);
        Route::get('/languages', [AdminDashboardController::class, 'languages']);
        Route::get('/activity', [AdminDashboardController::class, 'activity']);
        Route::get('/messages', [AdminDashboardController::class, 'messages']);

        Route::get('/users', [AdminResourcesController::class, 'users']);
        Route::patch('/users/{user}', [AdminResourcesController::class, 'updateUser']);
        Route::get('/matches', [AdminResourcesController::class, 'matches']);
        Route::get('/photos', [AdminResourcesController::class, 'photos']);
        Route::patch('/photos/{photo}', [AdminResourcesController::class, 'updatePhoto']);
        Route::get('/verifications', [AdminResourcesController::class, 'verifications']);
        Route::patch('/verifications/{verification}', [AdminResourcesController::class, 'updateVerification']);
        Route::get('/reports', [AdminResourcesController::class, 'reports']);
        Route::patch('/reports/{report}', [AdminResourcesController::class, 'updateReport']);
    });
});

Route::middleware(['auth:sanctum', 'throttle:120,1'])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::middleware([EnsureUserActive::class])->group(function () {
        Route::get('/profile', [ProfileController::class, 'show']);
        Route::post('/profile', [ProfileController::class, 'store']);
        Route::put('/profile', [ProfileController::class, 'update']);
        Route::post('/profile/hide', [ProfileController::class, 'hide']);
        Route::delete('/account', [ProfileController::class, 'destroy']);
        Route::get('/interests', [ProfileController::class, 'interests']);
        Route::get('/prompts', [ProfileController::class, 'promptsCatalog']);

        Route::post('/photos', [PhotoController::class, 'store']);
        Route::put('/photos/{photo}/primary', [PhotoController::class, 'setPrimary']);
        Route::delete('/photos/{photo}', [PhotoController::class, 'destroy']);
        Route::post('/verification/selfie', [VerificationController::class, 'store'])->middleware('throttle:5,60');

        Route::get('/discover', [DiscoverController::class, 'index']);
        Route::post('/like', [ActionController::class, 'like'])->middleware('throttle:60,1');
        Route::post('/pass', [ActionController::class, 'pass'])->middleware('throttle:60,1');
        Route::post('/rewind', [ActionController::class, 'rewind'])->middleware('throttle:30,1');
        Route::get('/matches', [ActionController::class, 'matches']);
        Route::get('/likes/received', [ActionController::class, 'likesReceived']);

        Route::get('/conversations', [ChatController::class, 'conversations']);
        Route::get('/badges', [ChatController::class, 'badges']);
        Route::get('/matches/{matchId}/messages', [ChatController::class, 'index']);
        Route::post('/matches/{matchId}/messages', [ChatController::class, 'store'])->middleware('throttle:60,1');
        Route::post('/matches/{matchId}/delivered', [ChatController::class, 'delivered'])->middleware('throttle:120,1');
        Route::post('/matches/{matchId}/read', [ChatController::class, 'read'])->middleware('throttle:120,1');
        Route::post('/matches/{matchId}/typing', [ChatController::class, 'typing'])->middleware('throttle:60,1');
        Route::post('/matches/{matchId}/presence', [ChatController::class, 'presence'])->middleware('throttle:120,1');

        Route::patch('/notifications', [AuthController::class, 'updateNotifications'])->middleware('throttle:30,1');

        Route::post('/report', [SafetyController::class, 'report'])->middleware('throttle:20,1');
        Route::post('/block', [SafetyController::class, 'block']);
        Route::delete('/block/{userId}', [SafetyController::class, 'unblock']);
    });
});
