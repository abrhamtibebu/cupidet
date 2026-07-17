<?php

namespace App\Jobs;

use App\Models\Message;
use App\Services\TelegramNotifier;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendMessageNotificationJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(public int $messageId) {}

    public function backoff(): array
    {
        return [5, 15, 45];
    }

    public function handle(TelegramNotifier $notifier): void
    {
        $message = Message::query()
            ->with(['sender.profile', 'match.userOne', 'match.userTwo'])
            ->find($this->messageId);

        if (! $message || ! $message->match) {
            return;
        }

        $sender = $message->sender;
        $recipient = $message->match->otherUser($message->sender_id);

        if (! $sender || ! $recipient) {
            return;
        }

        $notifier->notifyMessage(
            $recipient,
            $message->match_id,
            $sender->displayName(),
            (string) ($message->body ?? '')
        );
    }
}
