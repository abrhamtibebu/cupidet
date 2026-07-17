<?php

namespace App\Jobs;

use App\Models\TelegramGroup;
use App\Services\TelegramBotService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class BroadcastTelegramGroupsJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 600;

    /**
     * @param  list<int>|null  $chatIds  Null = all active groups
     * @param  string|null  $photoDiskPath  Path relative to the public disk
     */
    public function __construct(
        public string $text,
        public ?array $chatIds = null,
        public bool $withAppButton = true,
        public ?string $photoDiskPath = null,
    ) {}

    /**
     * @return array{
     *   sent: int,
     *   failed: int,
     *   results: list<array{chat_id: int, title: ?string, ok: bool, error: ?string}>
     * }
     */
    public function handle(TelegramBotService $bot): array
    {
        $query = TelegramGroup::query()->orderBy('id');

        if ($this->chatIds !== null) {
            $query->whereIn('chat_id', $this->chatIds);
        } else {
            $query->active();
        }

        $markup = $this->withAppButton ? $bot->miniAppLinkKeyboard('Open Mingle 251') : null;
        $photoAbs = null;
        if ($this->photoDiskPath) {
            $photoAbs = Storage::disk('public')->path($this->photoDiskPath);
            if (! is_readable($photoAbs)) {
                Log::error('Broadcast photo missing', ['path' => $this->photoDiskPath]);
                $photoAbs = null;
            }
        }

        $sent = 0;
        $failed = 0;
        $results = [];

        foreach ($query->cursor() as $group) {
            $outcome = $this->deliverToGroup($bot, $group->chat_id, $photoAbs, $markup);

            if ($outcome['ok']) {
                $sent++;
                $group->update([
                    'last_error' => null,
                    'is_active' => true,
                    'left_at' => null,
                ]);
            } else {
                $failed++;
                $updates = ['last_error' => $outcome['error']];
                // Only deactivate when the bot is truly gone from the chat
                if ($outcome['permanent']) {
                    $updates['is_active'] = false;
                    $updates['left_at'] = now();
                }
                $group->update($updates);
            }

            $results[] = [
                'chat_id' => $group->chat_id,
                'title' => $group->title,
                'ok' => $outcome['ok'],
                'error' => $outcome['error'],
            ];

            usleep(80_000);
        }

        Log::info('Telegram group broadcast finished', [
            'sent' => $sent,
            'failed' => $failed,
            'has_photo' => $photoAbs !== null,
            'preview' => mb_substr($this->text, 0, 80),
            'results' => $results,
        ]);

        return [
            'sent' => $sent,
            'failed' => $failed,
            'results' => $results,
        ];
    }

    /**
     * @return array{ok: bool, error: ?string, permanent: bool}
     */
    private function deliverToGroup(
        TelegramBotService $bot,
        int|string $chatId,
        ?string $photoAbs,
        ?array $markup,
    ): array {
        if ($photoAbs) {
            $captionUsed = false;
            $text = $this->text;
            $canCaption = $text !== '' && mb_strlen($text) <= 1024;
            $last = ['ok' => false, 'error' => null, 'permanent' => false];

            if ($canCaption) {
                $last = $bot->sendPhotoResult($chatId, $photoAbs, $text, $markup);
                $captionUsed = $last['ok'];

                if (! $last['ok']) {
                    $plain = trim(html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
                    if ($plain !== '') {
                        $last = $bot->sendPhotoResult($chatId, $photoAbs, $plain, $markup, null);
                        $captionUsed = $last['ok'];
                    }
                }
            }

            if (! $last['ok']) {
                $last = $bot->sendPhotoResult($chatId, $photoAbs, null, $markup);
            }

            if ($last['ok'] && $text !== '' && ! $captionUsed) {
                $textResult = $bot->sendMessageResult($chatId, $text, $markup);
                if (! $textResult['ok']) {
                    $plain = trim(html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
                    if ($plain !== '') {
                        $bot->sendMessageResult($chatId, $plain, $markup, null);
                    }
                }
            } elseif (! $last['ok'] && $text !== '') {
                $last = $bot->sendMessageResult($chatId, $text, $markup);
            }

            return $last;
        }

        if ($this->text === '') {
            return ['ok' => false, 'error' => 'Empty message', 'permanent' => false];
        }

        $last = $bot->sendMessageResult($chatId, $this->text, $markup);
        if (! $last['ok']) {
            $plain = trim(html_entity_decode(strip_tags($this->text), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
            if ($plain !== '') {
                $last = $bot->sendMessageResult($chatId, $plain, $markup, null);
            }
        }

        return $last;
    }
}
