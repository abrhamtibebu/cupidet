<?php

namespace App\Services;

use App\Events\MessageSent;
use App\Events\MessageStatusUpdated;
use App\Events\UserTyping;
use App\Jobs\SendMessageNotificationJob;
use App\Models\Block;
use App\Models\MatchModel;
use App\Models\Message;
use App\Models\User;
use App\Services\TelegramNotifier;
use Illuminate\Support\Collection;
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

            return [
                ...$item,
                'last_message' => $last ? $this->payload($last, $user->id) : null,
                'unread_count' => (int) ($unreadByMatch[$item['id']] ?? 0),
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

    public function messages(User $user, int $matchId): Collection
    {
        $match = $this->findAuthorizedMatch($user, $matchId);

        $this->markDelivered($user, $match->id);
        $this->markRead($user, $match->id);

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
        ]);

        $this->safeBroadcast(new MessageSent($message));

        try {
            SendMessageNotificationJob::dispatch($message->id);
        } catch (\Throwable) {
            // Queue unavailable — message is still saved.
        }

        return $this->payload($message, $user->id);
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
        $this->safeBroadcast(new UserTyping($match->id, $user->id, $typing));
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
