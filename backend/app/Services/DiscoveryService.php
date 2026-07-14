<?php

namespace App\Services;

use App\Jobs\SendLikeNotificationJob;
use App\Jobs\SendMatchNotificationJob;
use App\Models\Block;
use App\Models\Like;
use App\Models\MatchModel;
use App\Models\Pass;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class DiscoveryService
{
    public function feed(User $user, int $limit = 40): Collection
    {
        $preferences = $user->preferences;
        $excludedIds = $this->excludedUserIds($user);
        $myLat = $user->profile?->latitude;
        $myLng = $user->profile?->longitude;
        $maxDistance = $preferences?->max_distance_km ?? 50;

        $candidates = User::query()
            ->with(['profile', 'photos', 'interests', 'primaryPhoto', 'prompts'])
            ->where('status', 'active')
            ->where('id', '!=', $user->id)
            ->whereNotIn('id', $excludedIds)
            ->whereHas('profile')
            ->whereHas('photos', fn ($q) => $q->where('is_primary', true)->where('status', 'approved'))
            ->get();

        $myInterestIds = $user->interests->pluck('id')->all();
        $myLanguages = collect($user->profile?->languages ?? [])->map(fn ($l) => strtolower((string) $l))->all();
        $myLocation = strtolower((string) ($user->profile?->location ?? ''));
        $myAge = $user->age();
        $preferredLanguages = collect($preferences?->preferred_languages ?? [])->map(fn ($l) => strtolower((string) $l))->filter()->values()->all();
        $preferredInterestIds = collect($preferences?->preferred_interest_ids ?? [])->map(fn ($id) => (int) $id)->filter()->values()->all();
        $filterGoal = $user->profile?->relationship_goal;

        return $candidates
            ->filter(function (User $candidate) use ($preferences, $myLat, $myLng, $maxDistance, $preferredLanguages, $preferredInterestIds, $filterGoal) {
                $profile = $candidate->profile;
                if (! $profile) {
                    return false;
                }

                $age = $candidate->age();
                if ($preferences) {
                    if ($preferences->preferred_gender && $preferences->preferred_gender !== 'any') {
                        if ($profile->gender !== $preferences->preferred_gender) {
                            return false;
                        }
                    }
                    if ($age !== null) {
                        if ($age < $preferences->min_age || $age > $preferences->max_age) {
                            return false;
                        }
                    }
                    if ($preferences->preferred_location) {
                        if (strcasecmp((string) $profile->location, $preferences->preferred_location) !== 0) {
                            return false;
                        }
                    }
                }

                if ($filterGoal && $profile->relationship_goal && $profile->relationship_goal !== $filterGoal) {
                    return false;
                }

                if (count($preferredLanguages) > 0) {
                    $theirLanguages = collect($profile->languages ?? [])->map(fn ($l) => strtolower((string) $l))->all();
                    if (count(array_intersect($preferredLanguages, $theirLanguages)) === 0) {
                        return false;
                    }
                }

                if (count($preferredInterestIds) > 0) {
                    $theirInterestIds = $candidate->interests->pluck('id')->map(fn ($id) => (int) $id)->all();
                    if (count(array_intersect($preferredInterestIds, $theirInterestIds)) === 0) {
                        return false;
                    }
                }

                if ($myLat && $myLng && $profile->latitude && $profile->longitude) {
                    $km = $this->haversineKm($myLat, $myLng, $profile->latitude, $profile->longitude);
                    if ($km > $maxDistance) {
                        return false;
                    }
                }

                return true;
            })
            ->map(function (User $candidate) use ($myInterestIds, $myLanguages, $myLocation, $myAge, $myLat, $myLng) {
                $distance = null;
                if ($myLat && $myLng && $candidate->profile?->latitude && $candidate->profile?->longitude) {
                    $distance = round($this->haversineKm(
                        $myLat,
                        $myLng,
                        $candidate->profile->latitude,
                        $candidate->profile->longitude
                    ), 1);
                }

                $score = $this->score($candidate, $myInterestIds, $myLanguages, $myLocation, $myAge, $distance);
                $candidate->setAttribute('compatibility_score', $score);
                $candidate->setAttribute('distance_km', $distance);

                return $candidate;
            })
            ->sortByDesc('compatibility_score')
            ->take($limit)
            ->values();
    }

    public function like(User $sender, int $receiverId, string $type = 'like'): array
    {
        $receiver = User::query()->findOrFail($receiverId);
        $this->assertCanInteract($sender, $receiver);
        $type = $type === 'super' ? 'super' : 'like';

        $like = Like::query()->updateOrCreate(
            [
                'sender_id' => $sender->id,
                'receiver_id' => $receiver->id,
            ],
            ['type' => $type]
        );

        Pass::query()
            ->where('sender_id', $sender->id)
            ->where('receiver_id', $receiver->id)
            ->delete();

        $reciprocal = Like::query()
            ->where('sender_id', $receiver->id)
            ->where('receiver_id', $sender->id)
            ->exists();

        $match = null;
        if ($reciprocal) {
            [$one, $two] = MatchModel::orderedPair($sender->id, $receiver->id);
            $match = MatchModel::query()->firstOrCreate(
                ['user_one' => $one, 'user_two' => $two],
                ['matched_at' => now()]
            );
            SendMatchNotificationJob::dispatch($match->id);
            $receiver->load(['profile', 'photos', 'interests', 'primaryPhoto', 'prompts']);
        } else {
            SendLikeNotificationJob::dispatch($receiver->id, $sender->id, $type === 'super');
        }

        return [
            'like' => $like,
            'matched' => $match !== null,
            'match' => $match,
            'other_user' => $match ? $this->cardPayload($receiver, $sender) : null,
        ];
    }

    public function pass(User $sender, int $receiverId): Pass
    {
        $receiver = User::query()->findOrFail($receiverId);
        $this->assertCanInteract($sender, $receiver);

        Like::query()
            ->where('sender_id', $sender->id)
            ->where('receiver_id', $receiver->id)
            ->delete();

        Pass::query()
            ->where('sender_id', $sender->id)
            ->where('receiver_id', $receiver->id)
            ->delete();

        return Pass::query()->create([
            'sender_id' => $sender->id,
            'receiver_id' => $receiver->id,
        ]);
    }

    /**
     * Undo the most recent pass or unmatched like (Tinder-style rewind).
     */
    public function rewind(User $user): array
    {
        $lastPass = Pass::query()
            ->where('sender_id', $user->id)
            ->latest('id')
            ->first();

        $lastLike = Like::query()
            ->where('sender_id', $user->id)
            ->latest('id')
            ->get()
            ->first(function (Like $like) use ($user) {
                [$one, $two] = MatchModel::orderedPair($user->id, $like->receiver_id);

                return ! MatchModel::query()
                    ->where('user_one', $one)
                    ->where('user_two', $two)
                    ->exists();
            });

        if (! $lastPass && ! $lastLike) {
            throw ValidationException::withMessages([
                'rewind' => 'Nothing to rewind.',
            ]);
        }

        $undoPass = false;
        if ($lastPass && ! $lastLike) {
            $undoPass = true;
        } elseif ($lastPass && $lastLike) {
            $undoPass = $lastPass->created_at->gte($lastLike->created_at);
        }

        if ($undoPass && $lastPass) {
            $receiverId = (int) $lastPass->receiver_id;
            $lastPass->delete();
            $restored = User::query()->with(['profile', 'photos', 'interests', 'primaryPhoto', 'prompts'])->find($receiverId);

            return [
                'undone' => 'pass',
                'user' => $restored ? $this->cardPayload($restored, $user) : null,
            ];
        }

        $receiverId = (int) $lastLike->receiver_id;
        $lastLike->delete();
        $restored = User::query()->with(['profile', 'photos', 'interests', 'primaryPhoto', 'prompts'])->find($receiverId);

        return [
            'undone' => 'like',
            'user' => $restored ? $this->cardPayload($restored, $user) : null,
        ];
    }

    public function matches(User $user): Collection
    {
        $blockedIds = $this->blockedIds($user);

        return MatchModel::query()
            ->with([
                'userOne.profile',
                'userOne.photos',
                'userOne.interests',
                'userOne.primaryPhoto',
                'userOne.prompts',
                'userTwo.profile',
                'userTwo.photos',
                'userTwo.interests',
                'userTwo.primaryPhoto',
                'userTwo.prompts',
            ])
            ->where(function ($q) use ($user) {
                $q->where('user_one', $user->id)->orWhere('user_two', $user->id);
            })
            ->latest('matched_at')
            ->get()
            ->map(function (MatchModel $match) use ($user, $blockedIds) {
                $other = $match->otherUser($user->id);
                if (in_array($other->id, $blockedIds, true)) {
                    return null;
                }

                return [
                    'id' => $match->id,
                    'matched_at' => $match->matched_at,
                    'user' => $this->cardPayload($other, $user),
                    'telegram_chat_url' => $other->username
                        ? 'https://t.me/'.$other->username
                        : null,
                ];
            })
            ->filter()
            ->values();
    }

    public function likesReceived(User $user): Collection
    {
        $blockedIds = $this->blockedIds($user);
        $alreadyLikedBack = Like::query()->where('sender_id', $user->id)->pluck('receiver_id')->all();

        return Like::query()
            ->with(['sender.profile', 'sender.photos', 'sender.interests', 'sender.primaryPhoto', 'sender.prompts'])
            ->where('receiver_id', $user->id)
            ->latest()
            ->get()
            ->map(function (Like $like) use ($user, $blockedIds, $alreadyLikedBack) {
                $sender = $like->sender;
                if (! $sender || in_array($sender->id, $blockedIds, true)) {
                    return null;
                }

                $card = $this->cardPayload($sender, $user);
                $card['liked_at'] = $like->created_at;
                $card['like_type'] = $like->type;
                $card['you_liked_back'] = in_array($sender->id, $alreadyLikedBack, true);

                return $card;
            })
            ->filter()
            ->values();
    }

    public function cardPayload(User $user, ?User $viewer = null): array
    {
        $primary = $user->photos->firstWhere('is_primary', true)
            ?? $user->photos->first();

        $distance = $user->getAttribute('distance_km');
        if ($distance === null && $viewer?->profile?->latitude && $user->profile?->latitude) {
            $distance = round($this->haversineKm(
                $viewer->profile->latitude,
                $viewer->profile->longitude,
                $user->profile->latitude,
                $user->profile->longitude
            ), 1);
        }

        $isOnline = $user->last_active && $user->last_active->gte(now()->subMinutes(5));
        $catalog = config('cupid.prompts', []);

        return [
            'id' => $user->id,
            'name' => $user->displayName(),
            'age' => $user->age(),
            'location' => $user->profile?->location,
            'bio' => $user->profile?->bio,
            'gender' => $user->profile?->gender,
            'relationship_goal' => $user->profile?->relationship_goal,
            'height_cm' => $user->profile?->height_cm,
            'education' => $user->profile?->education,
            'occupation' => $user->profile?->occupation,
            'religion' => $user->profile?->religion,
            'languages' => $user->profile?->languages ?? [],
            'children' => $user->profile?->children,
            'pets' => $user->profile?->pets,
            'drinking' => $user->profile?->drinking,
            'smoking' => $user->profile?->smoking,
            'hobbies' => $user->profile?->hobbies ?? [],
            'prompts' => $user->relationLoaded('prompts')
                ? $user->prompts->map(function ($p) use ($catalog) {
                    return [
                        'prompt_key' => $p->prompt_key,
                        'label' => $catalog[$p->prompt_key] ?? $p->prompt_key,
                        'answer' => $p->answer,
                    ];
                })->values()->all()
                : [],
            'verified' => (bool) $user->verified,
            'photo_url' => $primary?->image_url ?? $user->photo_url,
            'photos' => $user->photos
                ->where('status', 'approved')
                ->values()
                ->map(fn ($p) => [
                    'id' => $p->id,
                    'image_url' => $p->image_url,
                    'is_primary' => $p->is_primary,
                ]),
            'interests' => $user->interests->pluck('name'),
            'username' => $user->username,
            'compatibility_score' => $user->getAttribute('compatibility_score'),
            'distance_km' => $distance,
            'is_online' => $isOnline,
            'last_active' => $user->last_active,
        ];
    }

    public function haversineKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earth = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;

        return $earth * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function score(User $candidate, array $myInterestIds, array $myLanguages, string $myLocation, ?int $myAge, ?float $distanceKm): int
    {
        $score = 0;
        $theirLocation = strtolower((string) ($candidate->profile?->location ?? ''));

        if ($myLocation !== '' && $theirLocation !== '' && $myLocation === $theirLocation) {
            $score += 30;
        } elseif ($distanceKm !== null && $distanceKm <= 10) {
            $score += 30;
        } elseif ($distanceKm !== null && $distanceKm <= 25) {
            $score += 20;
        }

        $theirAge = $candidate->age();
        if ($myAge !== null && $theirAge !== null && abs($myAge - $theirAge) <= 5) {
            $score += 20;
        }

        $shared = count(array_intersect($myInterestIds, $candidate->interests->pluck('id')->all()));
        if ($shared > 0) {
            $denom = max(count($myInterestIds), 1);
            $score += (int) round(30 * min(1, $shared / $denom));
        }

        $theirLanguages = collect($candidate->profile?->languages ?? [])->map(fn ($l) => strtolower((string) $l))->all();
        $sharedLang = count(array_intersect($myLanguages, $theirLanguages));
        if ($sharedLang > 0) {
            $score += min(15, $sharedLang * 5);
        }

        if ($candidate->relationLoaded('prompts') && $candidate->prompts->isNotEmpty()) {
            $score += 5;
        }

        if ($candidate->last_active && $candidate->last_active->gte(now()->subDays(7))) {
            $score += 20;
        }

        return $score;
    }

    private function excludedUserIds(User $user): array
    {
        $liked = Like::query()->where('sender_id', $user->id)->pluck('receiver_id');
        $passed = Pass::query()->where('sender_id', $user->id)->pluck('receiver_id');
        $blocked = collect($this->blockedIds($user));

        return $liked->merge($passed)->merge($blocked)->unique()->values()->all();
    }

    private function blockedIds(User $user): array
    {
        $outgoing = Block::query()->where('blocker_id', $user->id)->pluck('blocked_id');
        $incoming = Block::query()->where('blocked_id', $user->id)->pluck('blocker_id');

        return $outgoing->merge($incoming)->unique()->values()->all();
    }

    private function assertCanInteract(User $sender, User $receiver): void
    {
        if ($sender->id === $receiver->id) {
            throw ValidationException::withMessages(['user_id' => ['Cannot interact with yourself.']]);
        }

        if (! $receiver->isActive()) {
            throw ValidationException::withMessages(['user_id' => ['User is unavailable.']]);
        }

        $blocked = Block::query()
            ->where(function ($q) use ($sender, $receiver) {
                $q->where('blocker_id', $sender->id)->where('blocked_id', $receiver->id);
            })
            ->orWhere(function ($q) use ($sender, $receiver) {
                $q->where('blocker_id', $receiver->id)->where('blocked_id', $sender->id);
            })
            ->exists();

        if ($blocked) {
            throw ValidationException::withMessages(['user_id' => ['Interaction is blocked.']]);
        }
    }
}
