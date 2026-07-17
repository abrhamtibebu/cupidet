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

    public function handle(TelegramBotService $bot): void
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

        foreach ($query->cursor() as $group) {
            $ok = false;

            if ($photoAbs) {
                $captionUsed = false;
                $text = $this->text;
                $canCaption = $text !== '' && mb_strlen($text) <= 1024;

                if ($canCaption) {
                    $ok = $bot->sendPhoto($group->chat_id, $photoAbs, $text, $markup);
                    $captionUsed = $ok;

                    if (! $ok) {
                        $plain = trim(html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
                        if ($plain !== '') {
                            $ok = $bot->sendPhoto($group->chat_id, $photoAbs, $plain, $markup, null);
                            $captionUsed = $ok;
                        }
                    }
                }

                if (! $ok) {
                    $ok = $bot->sendPhoto($group->chat_id, $photoAbs, null, $markup);
                }

                // If the photo went out without a caption, send the description separately
                if ($ok && $text !== '' && ! $captionUsed) {
                    $sentText = $bot->sendMessage($group->chat_id, $text, $markup);
                    if (! $sentText) {
                        $plain = trim(html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
                        if ($plain !== '') {
                            $bot->sendMessage($group->chat_id, $plain, $markup, null);
                        }
                    }
                } elseif (! $ok && $text !== '') {
                    $ok = $bot->sendMessage($group->chat_id, $text, $markup);
                }
            } else {
                $ok = $this->text !== '' && $bot->sendMessage($group->chat_id, $this->text, $markup);
                if (! $ok && $this->text !== '') {
                    $plain = trim(html_entity_decode(strip_tags($this->text), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
                    if ($plain !== '') {
                        $ok = $bot->sendMessage($group->chat_id, $plain, $markup, null);
                    }
                }
            }

            if ($ok) {
                $sent++;
            } else {
                $failed++;
                $group->update([
                    'is_active' => false,
                    'left_at' => now(),
                ]);
            }

            usleep(50_000);
        }

        Log::info('Telegram group broadcast finished', [
            'sent' => $sent,
            'failed' => $failed,
            'has_photo' => $photoAbs !== null,
            'preview' => mb_substr($this->text, 0, 80),
        ]);
    }
}
