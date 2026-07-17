<?php

namespace App\Services;

use App\Models\TelegramBroadcast;
use App\Models\TelegramBroadcastOpen;
use App\Models\User;

class TelegramBroadcastTrackingService
{
    /**
     * Record a unique open when a user launches the Mini App from a broadcast button.
     *
     * @param  array{id?: int|string, username?: ?string, first_name?: ?string, last_name?: ?string}  $telegramUser
     */
    public function recordOpen(string $trackCode, User $user, array $telegramUser): void
    {
        $broadcastId = TelegramBroadcast::idFromTrackCode($trackCode);
        if ($broadcastId === null) {
            return;
        }

        $exists = TelegramBroadcast::query()->whereKey($broadcastId)->exists();
        if (! $exists) {
            return;
        }

        TelegramBroadcastOpen::query()->firstOrCreate(
            [
                'broadcast_id' => $broadcastId,
                'telegram_id' => (int) ($telegramUser['id'] ?? $user->telegram_id),
            ],
            [
                'user_id' => $user->id,
                'username' => $telegramUser['username'] ?? $user->username,
                'first_name' => $telegramUser['first_name'] ?? $user->first_name,
                'last_name' => $telegramUser['last_name'] ?? $user->last_name,
            ],
        );
    }
}
