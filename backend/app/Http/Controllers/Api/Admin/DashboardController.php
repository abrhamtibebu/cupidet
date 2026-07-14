<?php

namespace App\Http\Controllers\Api\Admin;

use App\Filament\Support\DashboardMetrics;
use App\Http\Controllers\Controller;
use App\Models\Interest;
use App\Models\Like;
use App\Models\MatchModel;
use App\Models\Message;
use App\Models\Photo;
use App\Models\Profile;
use App\Models\Report;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $openReports = Report::query()->where('status', 'open')->count();
        $pendingPhotos = Photo::query()->where('status', 'pending')->count();

        return response()->json([
            'total_users' => User::query()->count(),
            'active_7d' => User::query()->where('last_active', '>=', now()->subDays(7))->count(),
            'new_7d' => User::query()->where('created_at', '>=', now()->subDays(7))->count(),
            'verified_users' => User::query()->where('verified', true)->count(),
            'matches' => MatchModel::query()->count(),
            'likes' => Like::query()->count(),
            'pending_photos' => $pendingPhotos,
            'open_reports' => $openReports,
            'new_users_today' => User::query()->whereDate('created_at', today())->count(),
            'series' => [
                'users' => DashboardMetrics::dailySeries(User::query(), days: 15),
                'likes' => DashboardMetrics::dailySeries(Like::query(), days: 15),
                'spark_users' => DashboardMetrics::dailyCounts(User::query(), days: 14),
                'spark_active' => DashboardMetrics::dailyCounts(
                    User::query()->whereNotNull('last_active'),
                    'last_active',
                    14,
                ),
                'spark_matches' => DashboardMetrics::dailyCounts(MatchModel::query(), 'matched_at', 14),
            ],
        ]);
    }

    public function map(): JsonResponse
    {
        $points = Profile::query()
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->orderByDesc('updated_at')
            ->limit(200)
            ->get(['name', 'location', 'latitude', 'longitude'])
            ->map(fn (Profile $profile) => [
                'lat' => (float) $profile->latitude,
                'lng' => (float) $profile->longitude,
                'name' => (string) ($profile->name ?: 'User'),
                'location' => (string) ($profile->location ?: 'Ethiopia'),
            ])
            ->values();

        return response()->json(['points' => $points]);
    }

    public function locations(): JsonResponse
    {
        $total = max(1, (int) Profile::query()->whereNotNull('location')->where('location', '!=', '')->count());
        $palette = ['#dffc01', '#0a0a0a', '#38bdf8', '#f59e0b', '#22c55e', '#a3a3a3', '#c5e000', '#525252'];

        $rows = Profile::query()
            ->selectRaw('location, COUNT(*) as aggregate')
            ->whereNotNull('location')
            ->where('location', '!=', '')
            ->groupBy('location')
            ->orderByDesc('aggregate')
            ->limit(12)
            ->get()
            ->values()
            ->map(fn ($row, int $index) => [
                'name' => (string) $row->location,
                'count' => (int) $row->aggregate,
                'color' => $palette[$index % count($palette)],
                'percent' => round(((int) $row->aggregate / $total) * 100, 1),
            ]);

        return response()->json(['locations' => $rows]);
    }

    public function languages(): JsonResponse
    {
        $counts = collect(config('cupid.languages', []))
            ->mapWithKeys(fn (string $lang): array => [$lang => 0]);

        Profile::query()
            ->whereNotNull('languages')
            ->pluck('languages')
            ->each(function ($langs) use (&$counts): void {
                foreach ((array) $langs as $lang) {
                    if ($counts->has($lang)) {
                        $counts[$lang] = $counts[$lang] + 1;
                    }
                }
            });

        $languages = $counts
            ->map(fn (int $count, string $name) => compact('name', 'count'))
            ->values()
            ->sortByDesc('count')
            ->values();

        $interests = Interest::query()
            ->withCount('users')
            ->orderByDesc('users_count')
            ->limit(12)
            ->get()
            ->map(fn (Interest $interest) => [
                'name' => $interest->name,
                'count' => (int) $interest->users_count,
            ]);

        return response()->json([
            'languages' => $languages,
            'interests' => $interests,
        ]);
    }

    public function activity(): JsonResponse
    {
        $likes = Like::query()
            ->with(['sender.profile', 'receiver.profile'])
            ->latest()
            ->limit(8)
            ->get()
            ->map(function (Like $like) {
                $sender = $like->sender;
                $name = $sender?->profile?->name ?? $sender?->username ?? 'Someone';

                return [
                    'type' => 'like',
                    'name' => $name,
                    'text' => 'liked '.($like->receiver?->profile?->name ?? $like->receiver?->username ?? 'someone'),
                    'time' => $like->created_at?->diffForHumans(),
                    'photo' => $sender?->photo_url,
                    'timestamp' => $like->created_at?->getTimestamp() ?? 0,
                ];
            });

        $matches = MatchModel::query()
            ->with(['userOne.profile', 'userTwo.profile'])
            ->latest('matched_at')
            ->limit(8)
            ->get()
            ->map(function (MatchModel $match) {
                $one = $match->userOne;
                $name = $one?->profile?->name ?? $one?->username ?? 'Someone';
                $two = $match->userTwo?->profile?->name ?? $match->userTwo?->username ?? 'someone';

                return [
                    'type' => 'match',
                    'name' => $name,
                    'text' => 'matched with '.$two,
                    'time' => ($match->matched_at ?? $match->created_at)?->diffForHumans(),
                    'photo' => $one?->photo_url,
                    'timestamp' => ($match->matched_at ?? $match->created_at)?->getTimestamp() ?? 0,
                ];
            });

        $items = $likes->concat($matches)->sortByDesc('timestamp')->take(10)->values();

        return response()->json(['activity' => $items]);
    }

    public function messages(): JsonResponse
    {
        $messages = Message::query()
            ->with(['sender.profile'])
            ->latest()
            ->limit(8)
            ->get()
            ->map(function (Message $message) {
                $user = $message->sender;
                $name = $user?->profile?->name ?? $user?->username ?? 'Someone';

                return [
                    'name' => $name,
                    'preview' => str((string) $message->body)->limit(48)->toString(),
                    'time' => $message->created_at?->diffForHumans(),
                    'photo' => $user?->photo_url,
                ];
            });

        return response()->json(['messages' => $messages]);
    }
}
