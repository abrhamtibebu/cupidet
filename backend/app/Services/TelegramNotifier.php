<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class TelegramNotifier
{
    public function __construct(private TelegramBotService $bot) {}

    public function notifyMatch(User $recipient, string $otherName): bool
    {
        if ($recipient->notify_matches === false) {
            return false;
        }

        return $this->send(
            $recipient,
            "🎉 It's a Match!\n\nYou and <b>{$this->escape($otherName)}</b> liked each other.",
            'Open Matches',
            '/likes'
        );
    }

    public function notifyLike(User $recipient, string $likerName, bool $super = false): bool
    {
        if ($recipient->notify_likes === false) {
            return false;
        }

        $verb = $super ? 'super liked' : 'liked';

        return $this->send(
            $recipient,
            "💚 Someone {$verb} you!\n\n<b>{$this->escape($likerName)}</b> wants to connect.",
            'See Likes',
            '/likes'
        );
    }

    public function notifyMessage(User $recipient, int $matchId, string $senderName, string $preview = ''): bool
    {
        if ($recipient->notify_messages === false) {
            return false;
        }

        if ($this->isActiveInChat($recipient->id, $matchId)) {
            return false;
        }

        $debounceKey = "notify:msg:{$matchId}:{$recipient->id}";
        if (Cache::has($debounceKey)) {
            return false;
        }

        $snippet = trim($preview);
        $body = $snippet !== ''
            ? "💬 <b>{$this->escape($senderName)}</b>\n".$this->escape(mb_strimwidth($snippet, 0, 120, '…'))
            : "💬 <b>{$this->escape($senderName)}</b> sent you a message.";

        $ok = $this->send(
            $recipient,
            $body,
            'Open Chat',
            '/chat/'.$matchId
        );

        if ($ok) {
            Cache::put($debounceKey, true, now()->addSeconds(45));
        }

        return $ok;
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

    private function send(User $recipient, string $text, string $button, ?string $path = null): bool
    {
        if (! $recipient->telegram_id) {
            Log::info('Telegram notify skipped: no telegram_id', [
                'user_id' => $recipient->id,
            ]);

            return false;
        }

        $result = $this->bot->sendMessageResult(
            $recipient->telegram_id,
            $text,
            $this->bot->webAppKeyboard($button, $path)
        );

        if ($result['ok']) {
            return true;
        }

        Log::warning('Telegram notify send failed', [
            'user_id' => $recipient->id,
            'telegram_id' => $recipient->telegram_id,
            'path' => $path,
            'error' => $result['error'],
            'permanent' => $result['permanent'],
        ]);

        // Permanent failures (blocked bot, deleted account) should not retry.
        if ($result['permanent']) {
            return false;
        }

        throw new \RuntimeException($result['error'] ?? 'Telegram notify send failed');
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
