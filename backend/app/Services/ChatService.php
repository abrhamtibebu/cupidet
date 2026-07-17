<?php

namespace App\Services;

use App\Events\MessageSent;
use App\Events\MessageStatusUpdated;
use App\Events\UserTyping;
use App\Jobs\SendMessageNotificationJob;
use App\Models\Block;
use App\Models\ChatSetting;
use App\Models\Like;
use App\Models\MatchDate;
use App\Models\MatchModel;
use App\Models\Message;
use App\Models\User;
use App\Services\TelegramNotifier;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

class ChatService
{
    public function __construct(
        private DiscoveryService $discovery,
        private TelegramNotifier $notifier,
    ) {}

    public function conversations(User $user): Collection
    {
        $items = $this->discovery->matches($user);
        $matchIds = $items->pluck('id')->filter()->values()->all();

        if ($matchIds === []) {
            return collect();
        }

        $lastIds = Message::query()
            ->selectRaw('MAX(id) as id')
            ->whereIn('match_id', $matchIds)
            ->groupBy('match_id')
            ->pluck('id');

        $lastByMatch = Message::query()
            ->whereIn('id', $lastIds)
            ->get()
            ->keyBy('match_id');

        $unreadByMatch = Message::query()
            ->selectRaw('match_id, COUNT(*) as aggregate')
            ->whereIn('match_id', $matchIds)
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->groupBy('match_id')
            ->pluck('aggregate', 'match_id');

        return $items->map(function (array $item) use ($user, $lastByMatch, $unreadByMatch) {
            $last = $lastByMatch->get($item['id']);
            $otherId = (int) ($item['user']['id'] ?? 0);
            $settings = ChatSetting::query()
                ->where('user_id', $user->id)
                ->where('match_id', $item['id'])
                ->first();
            $upcoming = MatchDate::query()
                ->where('match_id', $item['id'])
                ->whereIn('status', ['pending', 'accepted'])
                ->where('scheduled_at', '>=', now()->subDay())
                ->orderBy('scheduled_at')
                ->first();

            return [
                ...$item,
                'last_message' => $last ? $this->payload($last, $user->id) : null,
                'unread_count' => (int) ($unreadByMatch[$item['id']] ?? 0),
                'peer_typing' => $otherId > 0 && $this->isTypingCached($item['id'], $otherId),
                'muted' => (bool) ($settings?->muted),
                'upcoming_date' => $upcoming ? $this->datePayload($upcoming) : null,
            ];
        });
    }

    /**
     * Lightweight badge counts for the bottom nav (avoids full conversation payloads).
     */
    public function badges(User $user): array
    {
        $matchIds = MatchModel::query()
            ->where(function ($q) use ($user) {
                $q->where('user_one', $user->id)->orWhere('user_two', $user->id);
            })
            ->pluck('id');

        $unreadMessages = $matchIds->isEmpty()
            ? 0
            : (int) Message::query()
                ->whereIn('match_id', $matchIds)
                ->where('sender_id', '!=', $user->id)
                ->whereNull('read_at')
                ->count();

        $likedBackIds = \App\Models\Like::query()
            ->where('sender_id', $user->id)
            ->pluck('receiver_id');

        $newLikes = (int) \App\Models\Like::query()
            ->where('receiver_id', $user->id)
            ->when($likedBackIds->isNotEmpty(), fn ($q) => $q->whereNotIn('sender_id', $likedBackIds))
            ->count();

        return [
            'unread_messages' => $unreadMessages,
            'new_likes' => $newLikes,
        ];
    }

    public function messages(User $user, int $matchId, bool $markSeen = true): Collection
    {
        $match = $this->findAuthorizedMatch($user, $matchId);

        if ($markSeen) {
            $this->markDelivered($user, $match->id);
            $this->markRead($user, $match->id);
        }

        return Message::query()
            ->where('match_id', $match->id)
            ->orderBy('created_at')
            ->get()
            ->map(fn (Message $m) => $this->payload($m, $user->id));
    }

    public function send(User $user, int $matchId, string $body): array
    {
        $match = $this->findAuthorizedMatch($user, $matchId);
        $other = $match->otherUser($user->id);

        $blocked = Block::query()
            ->where(function ($q) use ($user, $other) {
                $q->where('blocker_id', $user->id)->where('blocked_id', $other->id);
            })
            ->orWhere(function ($q) use ($user, $other) {
                $q->where('blocker_id', $other->id)->where('blocked_id', $user->id);
            })
            ->exists();

        if ($blocked) {
            throw ValidationException::withMessages([
                'body' => ['You cannot message this user.'],
            ]);
        }

        $message = Message::query()->create([
            'match_id' => $match->id,
            'sender_id' => $user->id,
            'body' => trim($body),
            'type' => 'text',
        ]);

        $this->safeBroadcast(new MessageSent($message));

        try {
            if (! $this->isMuted($other->id, $match->id)) {
                SendMessageNotificationJob::dispatch($message->id);
            }
        } catch (\Throwable) {
            // Queue unavailable — message is still saved.
        }

        return $this->payload($message, $user->id);
    }

    public function settings(User $user, int $matchId): array
    {
        $match = $this->findAuthorizedMatch($user, $matchId);
        $row = ChatSetting::query()->firstOrCreate(
            ['user_id' => $user->id, 'match_id' => $match->id],
            ['muted' => false],
        );

        return [
            'muted' => (bool) $row->muted,
            'upcoming_date' => $this->currentDate($match->id),
        ];
    }

    public function updateSettings(User $user, int $matchId, array $data): array
    {
        $match = $this->findAuthorizedMatch($user, $matchId);
        $row = ChatSetting::query()->updateOrCreate(
            ['user_id' => $user->id, 'match_id' => $match->id],
            ['muted' => (bool) ($data['muted'] ?? false)],
        );

        return [
            'muted' => (bool) $row->muted,
            'upcoming_date' => $this->currentDate($match->id),
        ];
    }

    public function proposeDate(User $user, int $matchId, array $data): array
    {
        $match = $this->findAuthorizedMatch($user, $matchId);
        $other = $match->otherUser($user->id);

        $date = MatchDate::query()->create([
            'match_id' => $match->id,
            'proposed_by' => $user->id,
            'scheduled_at' => $data['scheduled_at'],
            'place' => $data['place'] ?? null,
            'note' => $data['note'] ?? null,
            'status' => 'pending',
        ]);

        $when = $date->scheduled_at->timezone(config('app.timezone'))->format('D, M j · g:i A');
        $place = $date->place ? ' at '.$date->place : '';
        $body = "📅 Date proposal: {$when}{$place}";
        if ($date->note) {
            $body .= "\n".$date->note;
        }

        $message = Message::query()->create([
            'match_id' => $match->id,
            'sender_id' => $user->id,
            'body' => $body,
            'type' => 'date_proposal',
            'meta' => [
                'date_id' => $date->id,
                'scheduled_at' => $date->scheduled_at->toIso8601String(),
                'place' => $date->place,
                'note' => $date->note,
                'status' => $date->status,
            ],
        ]);

        $this->safeBroadcast(new MessageSent($message));

        try {
            if (! $this->isMuted($other->id, $match->id)) {
                SendMessageNotificationJob::dispatch($message->id);
            }
        } catch (\Throwable) {
            // ignore
        }

        return [
            'message' => $this->payload($message, $user->id),
            'date' => $this->datePayload($date),
        ];
    }

    public function respondDate(User $user, int $matchId, int $dateId, string $status): array
    {
        $match = $this->findAuthorizedMatch($user, $matchId);
        $date = MatchDate::query()
            ->where('match_id', $match->id)
            ->whereKey($dateId)
            ->firstOrFail();

        if ((int) $date->proposed_by === (int) $user->id && $status !== 'cancelled') {
            throw ValidationException::withMessages([
                'status' => ['Only the other person can accept or decline.'],
            ]);
        }

        if (! in_array($status, ['accepted', 'declined', 'cancelled'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Invalid status.'],
            ]);
        }

        $date->update(['status' => $status]);

        $label = match ($status) {
            'accepted' => 'accepted the date 🎉',
            'declined' => 'declined the date',
            default => 'cancelled the date',
        };

        $message = Message::query()->create([
            'match_id' => $match->id,
            'sender_id' => $user->id,
            'body' => $user->displayName().' '.$label,
            'type' => 'date_update',
            'meta' => [
                'date_id' => $date->id,
                'scheduled_at' => $date->scheduled_at->toIso8601String(),
                'place' => $date->place,
                'note' => $date->note,
                'status' => $date->status,
            ],
        ]);

        // Keep proposal cards in sync
        Message::query()
            ->where('match_id', $match->id)
            ->where('type', 'date_proposal')
            ->get()
            ->filter(fn (Message $m) => (int) ($m->meta['date_id'] ?? 0) === (int) $date->id)
            ->each(function (Message $m) use ($date) {
                $meta = $m->meta ?? [];
                $meta['status'] = $date->status;
                $m->update(['meta' => $meta]);
            });

        $this->safeBroadcast(new MessageSent($message));

        return [
            'message' => $this->payload($message, $user->id),
            'date' => $this->datePayload($date),
        ];
    }

    public function unmatch(User $user, int $matchId): void
    {
        $match = $this->findAuthorizedMatch($user, $matchId);
        $other = $match->otherUser($user->id);

        Like::query()
            ->where(function ($q) use ($user, $other) {
                $q->where('sender_id', $user->id)->where('receiver_id', $other->id);
            })
            ->orWhere(function ($q) use ($user, $other) {
                $q->where('sender_id', $other->id)->where('receiver_id', $user->id);
            })
            ->delete();

        $match->delete();
    }

    private function isMuted(int $userId, int $matchId): bool
    {
        return ChatSetting::query()
            ->where('user_id', $userId)
            ->where('match_id', $matchId)
            ->where('muted', true)
            ->exists();
    }

    private function currentDate(int $matchId): ?array
    {
        $upcoming = MatchDate::query()
            ->where('match_id', $matchId)
            ->whereIn('status', ['pending', 'accepted'])
            ->where('scheduled_at', '>=', now()->subDay())
            ->orderByRaw("CASE WHEN status = 'accepted' THEN 0 ELSE 1 END")
            ->orderBy('scheduled_at')
            ->first();

        return $upcoming ? $this->datePayload($upcoming) : null;
    }

    private function datePayload(MatchDate $date): array
    {
        return [
            'id' => $date->id,
            'match_id' => $date->match_id,
            'proposed_by' => $date->proposed_by,
            'scheduled_at' => $date->scheduled_at?->toIso8601String(),
            'place' => $date->place,
            'note' => $date->note,
            'status' => $date->status,
        ];
    }

    public function markPresence(User $user, int $matchId): void
    {
        $match = $this->findAuthorizedMatch($user, $matchId);
        $this->notifier->markActiveInChat($user->id, $match->id, 60);
    }

    public function markDelivered(User $user, int $matchId, ?array $messageIds = null): array
    {
        $match = $this->findAuthorizedMatch($user, $matchId);

        $query = Message::query()
            ->where('match_id', $match->id)
            ->where('sender_id', '!=', $user->id)
            ->whereNull('delivered_at');

        if ($messageIds) {
            $query->whereIn('id', $messageIds);
        }

        $ids = $query->pluck('id');
        if ($ids->isEmpty()) {
            return [];
        }

        Message::query()->whereIn('id', $ids)->update(['delivered_at' => now()]);

        $updated = Message::query()->whereIn('id', $ids)->get()
            ->map(fn (Message $m) => [
                'id' => $m->id,
                'delivered_at' => $m->delivered_at?->toISOString(),
                'read_at' => $m->read_at?->toISOString(),
            ])
            ->values()
            ->all();

        $this->safeBroadcast(new MessageStatusUpdated($match->id, $updated, 'delivered'));

        return $updated;
    }

    public function markRead(User $user, int $matchId): array
    {
        $match = $this->findAuthorizedMatch($user, $matchId);
        $this->notifier->markActiveInChat($user->id, $match->id, 60);
        $now = now();

        $ids = Message::query()
            ->where('match_id', $match->id)
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->pluck('id');

        if ($ids->isEmpty()) {
            return [];
        }

        Message::query()
            ->whereIn('id', $ids)
            ->whereNull('delivered_at')
            ->update(['delivered_at' => $now]);

        Message::query()->whereIn('id', $ids)->update(['read_at' => $now]);

        $updated = Message::query()->whereIn('id', $ids)->get()
            ->map(fn (Message $m) => [
                'id' => $m->id,
                'delivered_at' => $m->delivered_at?->toISOString(),
                'read_at' => $m->read_at?->toISOString(),
            ])
            ->values()
            ->all();

        $this->safeBroadcast(new MessageStatusUpdated($match->id, $updated, 'read'));

        return $updated;
    }

    public function typing(User $user, int $matchId, bool $typing): void
    {
        $match = $this->findAuthorizedMatch($user, $matchId);

        // Store a timestamp so polling clients can tell "still typing" vs stale cache.
        $key = $this->typingKey($match->id, $user->id);
        if ($typing) {
            Cache::put($key, now()->getTimestamp(), now()->addSeconds(8));
        } else {
            Cache::forget($key);
        }

        $this->safeBroadcast(new UserTyping($match->id, $user->id, $typing));
    }

    public function peerTyping(User $user, int $matchId): bool
    {
        $match = $this->findAuthorizedMatch($user, $matchId);
        $other = $match->otherUser($user->id);

        return $this->isTypingCached($match->id, (int) $other->id);
    }

    /**
     * Other participant card for the open chat header (avoids a second conversations round-trip).
     *
     * @return array<string, mixed>
     */
    public function peerCard(User $user, int $matchId): array
    {
        $match = $this->findAuthorizedMatch($user, $matchId);
        $other = $match->otherUser($user->id);
        $other->loadMissing(['profile', 'photos', 'interests', 'primaryPhoto', 'prompts']);

        return $this->discovery->cardPayload($other, $user);
    }

    private function isTypingCached(int $matchId, int $userId): bool
    {
        $ts = Cache::get($this->typingKey($matchId, $userId));
        if (! $ts) {
            return false;
        }

        // Legacy bool values from older deploys.
        if ($ts === true || $ts === 1 || $ts === '1') {
            return true;
        }

        return (now()->getTimestamp() - (int) $ts) <= 6;
    }

    private function typingKey(int $matchId, int $userId): string
    {
        return "typing:{$matchId}:{$userId}";
    }

    /**
     * Realtime is best-effort — never fail chat APIs when Reverb/Pusher is down.
     */
    private function safeBroadcast(object $event): void
    {
        try {
            $pending = broadcast($event);
            // Dispatch happens in PendingBroadcast::__destruct — force it inside try/catch.
            unset($pending);
        } catch (\Throwable) {
            // Ignore broadcast transport errors.
        }
    }

    private function payload(Message $message, int $viewerId): array
    {
        return [
            'id' => $message->id,
            'match_id' => $message->match_id,
            'body' => $message->body,
            'type' => $message->type ?: 'text',
            'meta' => $message->meta,
            'sender_id' => $message->sender_id,
            'is_mine' => $message->sender_id === $viewerId,
            'delivered_at' => $message->delivered_at,
            'read_at' => $message->read_at,
            'created_at' => $message->created_at,
            'status' => $this->statusFor($message, $viewerId),
        ];
    }

    private function statusFor(Message $message, int $viewerId): string
    {
        if ($message->sender_id !== $viewerId) {
            return 'received';
        }
        if ($message->read_at) {
            return 'seen';
        }
        if ($message->delivered_at) {
            return 'delivered';
        }

        return 'sent';
    }

    private function findAuthorizedMatch(User $user, int $matchId): MatchModel
    {
        $match = MatchModel::query()->findOrFail($matchId);
        if (! $match->involves($user->id)) {
            abort(403, 'Not your match.');
        }

        return $match;
    }
}
