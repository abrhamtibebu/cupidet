<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;

class TelegramNotifier
{
    public function __construct(private TelegramBotService $bot) {}

    public function notifyMatch(User $recipient, string $otherName): bool
    {
        if (! $recipient->notify_matches) {
            return false;
        }

        return $this->send(
            $recipient,
            "🎉 It's a Match!\n\nYou and <b>{$this->escape($otherName)}</b> liked each other.",
            'Open Matches'
        );
    }

    public function notifyLike(User $recipient, string $likerName, bool $super = false): bool
    {
        if (! $recipient->notify_likes) {
            return false;
        }

        $verb = $super ? 'super liked' : 'liked';

        return $this->send(
            $recipient,
            "💚 Someone {$verb} you!\n\n<b>{$this->escape($likerName)}</b> wants to connect.",
            'See Likes'
        );
    }

    public function notifyMessage(User $recipient, int $matchId, string $senderName, string $preview): bool
    {
        if (! $recipient->notify_messages) {
            return false;
        }

        if ($this->isActiveInChat($recipient->id, $matchId)) {
            return false;
        }

        $debounceKey = "notify:msg:{$matchId}:{$recipient->id}";
        if (! Cache::add($debounceKey, true, now()->addSeconds(120))) {
            return false;
        }

        // E2E-encrypted bodies are ciphertext; never leak them into notifications.
        $snippet = str_starts_with(trim($preview), 'enc1:')
            ? 'sent you a message 💬'
            : $this->escape(mb_strimwidth(trim($preview), 0, 120, '…'));

        return $this->send(
            $recipient,
            "💬 <b>{$this->escape($senderName)}</b>\n{$snippet}",
            'Open Chat'
        );
    }

    public function markActiveInChat(int $userId, int $matchId, int $ttlSeconds = 60): void
    {
        Cache::put($this->activeKey($userId, $matchId), true, now()->addSeconds($ttlSeconds));
    }

    public function isActiveInChat(int $userId, int $matchId): bool
    {
        return (bool) Cache::get($this->activeKey($userId, $matchId));
    }

    private function activeKey(int $userId, int $matchId): string
    {
        return "chat:active:{$userId}:{$matchId}";
    }

    private function send(User $recipient, string $text, string $button): bool
    {
        if (! $recipient->telegram_id) {
            return false;
        }

        return $this->bot->sendMessage(
            $recipient->telegram_id,
            $text,
            $this->bot->webAppKeyboard($button)
        );
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
