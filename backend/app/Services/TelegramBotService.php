<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class TelegramBotService
{
    public function sendMessage(int|string $chatId, string $text, ?array $replyMarkup = null): bool
    {
        $token = config('services.telegram.bot_token');
        if (! $token) {
            Log::warning('Telegram bot token missing; skip message', compact('chatId', 'text'));

            return false;
        }

        $payload = [
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'HTML',
        ];

        if ($replyMarkup) {
            $payload['reply_markup'] = $replyMarkup;
        }

        try {
            // Local Windows often hits SSL MITM (antivirus); skip verify in local only.
            $pending = Http::timeout(15);
            if (app()->environment('local')) {
                $pending = $pending->withoutVerifying();
            }

            $response = $pending->post("https://api.telegram.org/bot{$token}/sendMessage", $payload);
            $response->throw();

            return true;
        } catch (RequestException|ConnectionException|Throwable $e) {
            Log::error('Telegram sendMessage failed', [
                'chat_id' => $chatId,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
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

    public function handleUpdate(array $update): void
    {
        $message = $update['message'] ?? null;
        if (! $message) {
            return;
        }

        $chatId = $message['chat']['id'] ?? null;
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
}
