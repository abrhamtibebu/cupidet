<?php

namespace App\Filament\Widgets;

use App\Models\Message;
use Filament\Widgets\Widget;
use Illuminate\Support\Collection;

class ChatRequestsWidget extends Widget
{
    protected static ?int $sort = 6;

    protected string $view = 'filament.widgets.chat-requests';

    protected int | string | array $columnSpan = [
        'default' => 'full',
        'md' => 1,
        'xl' => 1,
    ];

    /**
     * @return Collection<int, array{name: string, preview: string, time: string, photo: ?string, initials: string}>
     */
    public function getMessages(): Collection
    {
        return Message::query()
            ->with(['sender.profile'])
            ->latest()
            ->limit(6)
            ->get()
            ->map(function (Message $message): array {
                $user = $message->sender;
                $name = $user?->profile?->name
                    ?? $user?->username
                    ?? $user?->first_name
                    ?? 'Someone';
                $preview = str((string) $message->body)->limit(42)->toString();
                $initials = strtoupper(mb_substr(preg_replace('/\s+/', '', $name) ?: 'U', 0, 2));

                return [
                    'name' => $name,
                    'preview' => $preview,
                    'time' => $message->created_at?->diffForHumans() ?? '',
                    'photo' => $user?->photo_url,
                    'initials' => $initials,
                ];
            });
    }
}
