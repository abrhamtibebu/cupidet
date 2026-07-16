<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MatchModel;
use App\Models\Photo;
use App\Models\Report;
use App\Models\User;
use App\Models\VerificationRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class ResourcesController extends Controller
{
    public function users(Request $request): JsonResponse
    {
        $bucket = $request->string('bucket')->toString() ?: 'all';

        $query = User::query()->with('profile')->latest('last_active');

        if ($bucket === 'online') {
            $query->where('last_active', '>=', now()->subDay());
        } elseif ($bucket === 'new') {
            $query->where('created_at', '>=', now()->subDays(14));
        }

        if ($search = $request->string('q')->toString()) {
            $query->where(function ($q) use ($search): void {
                $q->where('username', 'like', "%{$search}%")
                    ->orWhereHas('profile', fn ($p) => $p->where('name', 'like', "%{$search}%"));
            });
        }

        $paginator = $this->paginate($query, $request, 50);

        $data = collect($paginator->items())->map(fn (User $user) => [
            'id' => $user->id,
            'username' => $user->username,
            'name' => $user->profile?->name,
            'location' => $user->profile?->location,
            'verified' => (bool) $user->verified,
            'status' => $user->status,
            'last_active' => optional($user->last_active)?->toIso8601String(),
            'created_at' => optional($user->created_at)?->toIso8601String(),
            'photo_url' => $user->photo_url,
        ]);

        return response()->json([
            'data' => $data,
            'meta' => $this->meta($paginator),
        ]);
    }

    public function updateUser(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', 'in:active,hidden,suspended,banned'],
            'verified' => ['sometimes', 'boolean'],
        ]);

        $user->fill($data)->save();

        return response()->json(['user' => [
            'id' => $user->id,
            'status' => $user->status,
            'verified' => (bool) $user->verified,
        ]]);
    }

    public function matches(Request $request): JsonResponse
    {
        $query = MatchModel::query()
            ->with(['userOne.profile', 'userTwo.profile'])
            ->withCount('messages')
            ->latest('matched_at');

        $paginator = $this->paginate($query, $request, 50);

        $data = collect($paginator->items())->map(fn (MatchModel $match) => [
            'id' => $match->id,
            'user_one' => $match->userOne?->profile?->name ?? $match->userOne?->username,
            'user_two' => $match->userTwo?->profile?->name ?? $match->userTwo?->username,
            'messages_count' => $match->messages_count,
            'matched_at' => optional($match->matched_at)?->toIso8601String(),
        ]);

        return response()->json([
            'data' => $data,
            'meta' => $this->meta($paginator),
        ]);
    }

    public function photos(Request $request): JsonResponse
    {
        $status = $request->string('status')->toString() ?: null;

        $query = Photo::query()->with(['user.profile'])->latest();
        if ($status) {
            $query->where('status', $status);
        }

        $paginator = $this->paginate($query, $request, 60);

        $data = collect($paginator->items())->map(fn (Photo $photo) => [
            'id' => $photo->id,
            'image_url' => $photo->image_url,
            'status' => $photo->status,
            'is_primary' => (bool) $photo->is_primary,
            'username' => $photo->user?->username,
            'name' => $photo->user?->profile?->name,
            'created_at' => optional($photo->created_at)?->toIso8601String(),
        ]);

        return response()->json([
            'data' => $data,
            'meta' => $this->meta($paginator),
        ]);
    }

    public function updatePhoto(Request $request, Photo $photo): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:pending,approved,rejected'],
        ]);

        $photo->update($data);

        return response()->json(['photo' => [
            'id' => $photo->id,
            'status' => $photo->status,
        ]]);
    }

    public function verifications(Request $request): JsonResponse
    {
        $status = $request->string('status')->toString() ?: null;

        $query = VerificationRequest::query()
            ->with(['user.profile', 'user.photos'])
            ->latest();

        if ($status) {
            $query->where('status', $status);
        }

        $paginator = $this->paginate($query, $request, 40);

        $data = collect($paginator->items())->map(function (VerificationRequest $verification) {
            $photos = ($verification->user?->photos ?? collect())
                ->sortByDesc(fn (Photo $photo) => (int) $photo->is_primary)
                ->values()
                ->map(fn (Photo $photo) => [
                    'id' => $photo->id,
                    'image_url' => $photo->image_url,
                    'is_primary' => (bool) $photo->is_primary,
                    'status' => $photo->status,
                ]);

            $primary = $photos->firstWhere('is_primary', true) ?? $photos->first();

            return [
                'id' => $verification->id,
                'selfie_url' => $verification->selfie_url,
                'status' => $verification->status,
                'notes' => $verification->notes,
                'username' => $verification->user?->username,
                'name' => $verification->user?->profile?->name,
                'verified' => (bool) $verification->user?->verified,
                'created_at' => optional($verification->created_at)?->toIso8601String(),
                'reviewed_at' => optional($verification->reviewed_at)?->toIso8601String(),
                'photos' => $photos,
                'primary_photo_url' => is_array($primary)
                    ? ($primary['image_url'] ?? $verification->user?->photo_url)
                    : $verification->user?->photo_url,
            ];
        });

        return response()->json([
            'data' => $data,
            'meta' => $this->meta($paginator),
        ]);
    }

    public function updateVerification(Request $request, VerificationRequest $verification): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:pending,approved,rejected'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        $verification->fill([
            'status' => $data['status'],
            'notes' => array_key_exists('notes', $data) ? $data['notes'] : $verification->notes,
            'reviewed_at' => $data['status'] === 'pending' ? null : now(),
            'reviewed_by' => $data['status'] === 'pending' ? null : $request->user()->id,
        ])->save();

        $verification->user?->forceFill([
            'verified' => $data['status'] === 'approved',
        ])->save();

        return response()->json(['verification' => [
            'id' => $verification->id,
            'status' => $verification->status,
            'reviewed_at' => optional($verification->reviewed_at)?->toIso8601String(),
            'notes' => $verification->notes,
        ]]);
    }

    public function reports(Request $request): JsonResponse
    {
        $status = $request->string('status')->toString();

        $query = Report::query()
            ->with(['reporter.profile', 'reportedUser.profile'])
            ->latest();

        if ($status) {
            $query->where('status', $status);
        }

        $paginator = $this->paginate($query, $request, 50);

        $data = collect($paginator->items())->map(fn (Report $report) => [
            'id' => $report->id,
            'reason' => $report->reason,
            'status' => $report->status,
            'details' => $report->details,
            'notes' => $report->notes,
            'reporter' => $report->reporter?->username,
            'reported' => $report->reportedUser?->username,
            'created_at' => optional($report->created_at)?->toIso8601String(),
        ]);

        return response()->json([
            'data' => $data,
            'meta' => $this->meta($paginator),
        ]);
    }

    public function updateReport(Request $request, Report $report): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', 'in:open,reviewing,resolved,dismissed'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        $report->fill($data)->save();

        return response()->json(['report' => [
            'id' => $report->id,
            'status' => $report->status,
            'notes' => $report->notes,
        ]]);
    }

    private function paginate($query, Request $request, int $defaultPerPage): LengthAwarePaginator
    {
        $perPage = min(100, max(1, (int) $request->integer('per_page', $defaultPerPage)));

        return $query->paginate($perPage)->appends($request->query());
    }

    private function meta(LengthAwarePaginator $paginator): array
    {
        return [
            'total' => $paginator->total(),
            'per_page' => $paginator->perPage(),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
        ];
    }
}
