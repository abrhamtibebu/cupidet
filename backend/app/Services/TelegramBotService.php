<?php

namespace App\Services;

use App\Models\TelegramGroup;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class TelegramBotService
{
    public function sendMessage(
        int|string $chatId,
        string $text,
        ?array $replyMarkup = null,
        ?string $parseMode = 'HTML',
    ): bool {
        return $this->sendMessageResult($chatId, $text, $replyMarkup, $parseMode)['ok'];
    }

    /**
     * @return array{ok: bool, error: ?string, permanent: bool}
     */
    public function sendMessageResult(
        int|string $chatId,
        string $text,
        ?array $replyMarkup = null,
        ?string $parseMode = 'HTML',
    ): array {
        $token = config('services.telegram.bot_token');
        if (! $token) {
            Log::warning('Telegram bot token missing; skip message', compact('chatId', 'text'));

            return ['ok' => false, 'error' => 'Bot token missing', 'permanent' => false];
        }

        $payload = [
            'chat_id' => $chatId,
            'text' => $text,
            'disable_web_page_preview' => false,
        ];

        if ($parseMode) {
            $payload['parse_mode'] = $parseMode;
        }

        if ($replyMarkup) {
            $payload['reply_markup'] = $replyMarkup;
        }

        return $this->postTelegram('sendMessage', $payload);
    }

    /**
     * @param  string  $photoAbsolutePath  Local filesystem path to the image
     */
    public function sendPhoto(
        int|string $chatId,
        string $photoAbsolutePath,
        ?string $caption = null,
        ?array $replyMarkup = null,
        ?string $parseMode = 'HTML',
    ): bool {
        return $this->sendPhotoResult($chatId, $photoAbsolutePath, $caption, $replyMarkup, $parseMode)['ok'];
    }

    /**
     * @return array{ok: bool, error: ?string, permanent: bool}
     */
    public function sendPhotoResult(
        int|string $chatId,
        string $photoAbsolutePath,
        ?string $caption = null,
        ?array $replyMarkup = null,
        ?string $parseMode = 'HTML',
    ): array {
        $token = config('services.telegram.bot_token');
        if (! $token) {
            Log::warning('Telegram bot token missing; skip photo', compact('chatId'));

            return ['ok' => false, 'error' => 'Bot token missing', 'permanent' => false];
        }

        if (! is_readable($photoAbsolutePath)) {
            Log::error('Telegram sendPhoto: file not readable', ['path' => $photoAbsolutePath]);

            return ['ok' => false, 'error' => 'Photo file not readable', 'permanent' => false];
        }

        try {
            $pending = Http::timeout(60)->asMultipart();
            if (app()->environment('local')) {
                $pending = $pending->withoutVerifying();
            }

            $parts = [
                [
                    'name' => 'chat_id',
                    'contents' => (string) $chatId,
                ],
                [
                    'name' => 'photo',
                    'contents' => fopen($photoAbsolutePath, 'r'),
                    'filename' => basename($photoAbsolutePath),
                ],
            ];

            if ($caption !== null && $caption !== '') {
                $parts[] = [
                    'name' => 'caption',
                    'contents' => mb_substr($caption, 0, 1024),
                ];
                if ($parseMode) {
                    $parts[] = [
                        'name' => 'parse_mode',
                        'contents' => $parseMode,
                    ];
                }
            }

            if ($replyMarkup) {
                $parts[] = [
                    'name' => 'reply_markup',
                    'contents' => json_encode($replyMarkup, JSON_UNESCAPED_UNICODE),
                ];
            }

            $response = $pending->post("https://api.telegram.org/bot{$token}/sendPhoto", $parts);
            if (! $response->successful()) {
                return $this->telegramFailure($response->json('description'), $response->json('error_code'));
            }

            return ['ok' => true, 'error' => null, 'permanent' => false];
        } catch (RequestException $e) {
            $body = $e->response?->json() ?? [];

            return $this->telegramFailure(
                $body['description'] ?? $e->getMessage(),
                $body['error_code'] ?? null,
            );
        } catch (ConnectionException|Throwable $e) {
            Log::error('Telegram sendPhoto failed', [
                'chat_id' => $chatId,
                'error' => $e->getMessage(),
            ]);

            return ['ok' => false, 'error' => $e->getMessage(), 'permanent' => false];
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{ok: bool, error: ?string, permanent: bool}
     */
    private function postTelegram(string $method, array $payload): array
    {
        $token = config('services.telegram.bot_token');
        if (! $token) {
            return ['ok' => false, 'error' => 'Bot token missing', 'permanent' => false];
        }

        try {
            $pending = Http::timeout(15);
            if (app()->environment('local')) {
                $pending = $pending->withoutVerifying();
            }

            $response = $pending->post("https://api.telegram.org/bot{$token}/{$method}", $payload);
            if (! $response->successful()) {
                return $this->telegramFailure($response->json('description'), $response->json('error_code'));
            }

            return ['ok' => true, 'error' => null, 'permanent' => false];
        } catch (RequestException $e) {
            $body = $e->response?->json() ?? [];

            return $this->telegramFailure(
                $body['description'] ?? $e->getMessage(),
                $body['error_code'] ?? null,
            );
        } catch (ConnectionException|Throwable $e) {
            Log::error("Telegram {$method} failed", [
                'chat_id' => $payload['chat_id'] ?? null,
                'error' => $e->getMessage(),
            ]);

            return ['ok' => false, 'error' => $e->getMessage(), 'permanent' => false];
        }
    }

    /**
     * @return array{ok: bool, error: ?string, permanent: bool}
     */
    private function telegramFailure(?string $description, mixed $code = null): array
    {
        $description = trim((string) $description);
        $lower = strtolower($description);
        $permanent = str_contains($lower, 'kicked')
            || str_contains($lower, 'chat not found')
            || str_contains($lower, 'bot was blocked')
            || str_contains($lower, 'deactivated');

        $friendly = match (true) {
            str_contains($lower, 'not enough rights') => 'Bot needs admin rights to post in this group (members cannot send messages).',
            str_contains($lower, 'kicked') => 'Bot was removed from this group.',
            str_contains($lower, 'chat not found') => 'Chat not found — bot may have been removed.',
            str_contains($lower, 'have no rights') => 'Bot needs permission to post in this group.',
            str_contains($lower, 'topic_closed') => 'Forum topic is closed.',
            default => $description !== '' ? $description : 'Telegram send failed',
        };

        Log::warning('Telegram API failure', [
            'code' => $code,
            'description' => $description,
            'friendly' => $friendly,
            'permanent' => $permanent,
        ]);

        return ['ok' => false, 'error' => $friendly, 'permanent' => $permanent];
    }

    public function webAppKeyboard(string $text = 'Open Mingle 251'): array
    {
        $url = rtrim((string) config('services.telegram.mini_app_url'), '/');
        // Guard against stale tunnel URLs still set on the server
        if ($url === '' || str_contains($url, 'trycloudflare.com') || str_contains($url, 'localhost')) {
            $url = 'https://mingle-251.onrender.com';
        }

        return [
            'inline_keyboard' => [[
                [
                    'text' => $text,
                    'web_app' => ['url' => $url.'/'],
                ],
            ]],
        ];
    }

    /** URL button safe for groups (web_app buttons only work in private chats). */
    public function miniAppLinkKeyboard(string $text = 'Open Mingle 251'): array
    {
        $bot = ltrim((string) config('services.telegram.bot_username', ''), '@');
        $url = $bot !== ''
            ? "https://t.me/{$bot}?startapp"
            : rtrim((string) config('services.telegram.mini_app_url'), '/').'/';

        if ($url === '/' || str_contains($url, 'trycloudflare.com') || str_contains($url, 'localhost')) {
            $url = 'https://mingle-251.onrender.com/';
        }

        return [
            'inline_keyboard' => [[
                [
                    'text' => $text,
                    'url' => $url,
                ],
            ]],
        ];
    }

    public function handleUpdate(array $update): void
    {
        if (isset($update['my_chat_member'])) {
            $this->handleMyChatMember($update['my_chat_member']);

            return;
        }

        $message = $update['message'] ?? $update['edited_message'] ?? null;
        if (! $message) {
            return;
        }

        $chat = $message['chat'] ?? [];
        $chatType = (string) ($chat['type'] ?? '');

        // Discover / refresh groups silently (do not auto-reply in groups)
        if (in_array($chatType, ['group', 'supergroup'], true)) {
            $this->upsertGroupFromChat($chat, active: true);

            return;
        }

        if ($chatType !== 'private') {
            return;
        }

        $chatId = $chat['id'] ?? null;
        $text = trim((string) ($message['text'] ?? ''));
        if (! $chatId || $text === '') {
            return;
        }

        $command = strtolower(explode(' ', $text)[0]);
        $command = explode('@', $command)[0];

        match ($command) {
            '/start' => $this->sendMessage(
                $chatId,
                "❤️ <b>Welcome to Mingle 251</b>\n\nMeet genuine people from the Habesha community.\n\nCreate your profile and discover meaningful connections.",
                $this->webAppKeyboard()
            ),
            '/profile' => $this->sendMessage(
                $chatId,
                'View and edit your Mingle 251 profile.',
                $this->webAppKeyboard('Open Profile')
            ),
            '/settings' => $this->sendMessage(
                $chatId,
                'Manage your Mingle 251 account settings.',
                $this->webAppKeyboard('Open Settings')
            ),
            '/help' => $this->sendMessage(
                $chatId,
                "Mingle 251 Help\n\n/start — Open the app\n/profile — Your profile\n/settings — Account settings\n/help — This message\n\nNeed support? Contact the Mingle 251 team."
            ),
            default => $this->sendMessage(
                $chatId,
                'Use /start to open Mingle 251.',
                $this->webAppKeyboard()
            ),
        };
    }

    /**
     * @param  array<string, mixed>  $myChatMember
     */
    private function handleMyChatMember(array $myChatMember): void
    {
        $chat = $myChatMember['chat'] ?? [];
        $chatType = (string) ($chat['type'] ?? '');

        if (! in_array($chatType, ['group', 'supergroup'], true)) {
            return;
        }

        $newStatus = (string) ($myChatMember['new_chat_member']['status'] ?? '');
        $active = in_array($newStatus, ['member', 'administrator', 'restricted'], true);

        $this->upsertGroupFromChat($chat, $active);
    }

    /**
     * @param  array<string, mixed>  $chat
     */
    public function upsertGroupFromChat(array $chat, bool $active): void
    {
        $chatId = $chat['id'] ?? null;
        if ($chatId === null) {
            return;
        }

        $attrs = [
            'title' => isset($chat['title']) ? (string) $chat['title'] : null,
            'type' => (string) ($chat['type'] ?? 'group'),
            'username' => isset($chat['username']) ? (string) $chat['username'] : null,
            'is_active' => $active,
        ];

        if ($active) {
            $attrs['joined_at'] = now();
            $attrs['left_at'] = null;
        } else {
            $attrs['left_at'] = now();
        }

        $group = TelegramGroup::query()->firstOrNew(['chat_id' => (int) $chatId]);

        // Don't overwrite joined_at on every message refresh while still active
        if ($group->exists && $active && $group->is_active) {
            unset($attrs['joined_at']);
        }

        $group->fill($attrs);
        $group->save();
    }
}
