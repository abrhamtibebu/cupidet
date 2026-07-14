<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\TelegramNotifier;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendLikeNotificationJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $receiverId,
        public int $senderId,
        public bool $super = false,
    ) {}

    public function handle(TelegramNotifier $notifier): void
    {
        $receiver = User::query()->find($this->receiverId);
        $sender = User::query()->with('profile')->find($this->senderId);

        if (! $receiver || ! $sender) {
            return;
        }

        $notifier->notifyLike($receiver, $sender->displayName(), $this->super);
    }
}
