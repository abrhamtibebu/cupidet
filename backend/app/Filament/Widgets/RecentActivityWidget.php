<?php

namespace App\Filament\Widgets;

use App\Models\Like;
use App\Models\MatchModel;
use App\Models\Message;
use App\Models\Report;
use App\Models\User;
use Filament\Widgets\Widget;
use Illuminate\Support\Collection;

class RecentActivityWidget extends Widget
{
    protected static ?int $sort = 5;

    protected string $view = 'filament.widgets.recent-activity';

    protected int | string | array $columnSpan = [
        'default' => 'full',
        'md' => 1,
        'xl' => 1,
    ];

    /**
     * @return Collection<int, array{name: string, text: string, time: string, photo: ?string, initials: string}>
     */
    public function getActivities(): Collection
    {
        $likes = Like::query()
            ->with(['sender.profile', 'receiver.profile'])
            ->latest()
            ->limit(6)
            ->get()
            ->map(function (Like $like): array {
                $sender = $like->sender;

                return $this->item(
                    user: $sender,
                    text: 'liked '.($like->receiver?->profile?->name ?? $like->receiver?->username ?? 'someone'),
                    at: $like->created_at,
                );
            });

        $matches = MatchModel::query()
            ->with(['userOne.profile', 'userTwo.profile'])
            ->latest('matched_at')
            ->limit(6)
            ->get()
            ->map(function (MatchModel $match): array {
                $one = $match->userOne;
                $twoName = $match->userTwo?->profile?->name ?? $match->userTwo?->username ?? 'someone';

                return $this->item(
                    user: $one,
                    text: 'matched with '.$twoName,
                    at: $match->matched_at ?? $match->created_at,
                );
            });

        $messages = Message::query()
            ->with(['sender.profile'])
            ->latest()
            ->limit(6)
            ->get()
            ->map(function (Message $message): array {
                return $this->item(
                    user: $message->sender,
                    text: 'sent a message',
                    at: $message->created_at,
                );
            });

        $reports = Report::query()
            ->with(['reporter.profile'])
            ->latest()
            ->limit(4)
            ->get()
            ->map(function (Report $report): array {
                return $this->item(
                    user: $report->reporter,
                    text: 'opened a report',
                    at: $report->created_at,
                );
            });

        return $likes
            ->concat($matches)
            ->concat($messages)
            ->concat($reports)
            ->sortByDesc('timestamp')
            ->take(8)
            ->values();
    }

    /**
     * @return array{name: string, text: string, time: string, photo: ?string, initials: string, timestamp: int}
     */
    protected function item(?User $user, string $text, mixed $at): array
    {
        $name = $user?->profile?->name
            ?? $user?->username
            ?? $user?->first_name
            ?? 'Someone';

        $photo = $user?->photo_url;
        $initials = strtoupper(mb_substr(preg_replace('/\s+/', '', $name) ?: 'U', 0, 2));

        return [
            'name' => $name,
            'text' => $text,
            'time' => $at?->diffForHumans() ?? 'just now',
            'photo' => $photo,
            'initials' => $initials,
            'timestamp' => $at?->getTimestamp() ?? 0,
        ];
    }
}
