<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\BroadcastTelegramGroupsJob;
use App\Models\TelegramBroadcast;
use App\Models\TelegramGroup;
use App\Support\TelegramHtml;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BroadcastController extends Controller
{
    public function groups(Request $request): JsonResponse
    {
        $activeOnly = $request->boolean('active_only');

        $query = TelegramGroup::query()->latest('updated_at');
        if ($activeOnly) {
            $query->active();
        }

        $groups = $query->get()->map(fn (TelegramGroup $g) => [
            'id' => $g->id,
            'chat_id' => $g->chat_id,
            'title' => $g->title,
            'type' => $g->type,
            'username' => $g->username,
            'is_active' => (bool) $g->is_active,
            'last_error' => $g->last_error,
            'joined_at' => optional($g->joined_at)?->toIso8601String(),
            'left_at' => optional($g->left_at)?->toIso8601String(),
            'updated_at' => optional($g->updated_at)?->toIso8601String(),
        ]);

        return response()->json([
            'data' => $groups,
            'meta' => [
                'total' => $groups->count(),
                'active' => TelegramGroup::query()->active()->count(),
            ],
        ]);
    }

    public function updateGroup(Request $request, TelegramGroup $telegramGroup): JsonResponse
    {
        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $telegramGroup->is_active = (bool) $data['is_active'];
        $telegramGroup->left_at = $telegramGroup->is_active ? null : now();
        if ($telegramGroup->is_active && ! $telegramGroup->joined_at) {
            $telegramGroup->joined_at = now();
        }
        $telegramGroup->save();

        return response()->json([
            'group' => [
                'id' => $telegramGroup->id,
                'is_active' => (bool) $telegramGroup->is_active,
            ],
        ]);
    }

    public function broadcast(Request $request): JsonResponse
    {
        $data = $request->validate([
            'message' => ['nullable', 'string', 'max:20000'],
            'message_text' => ['nullable', 'string', 'max:20000'],
            'with_app_button' => ['sometimes', 'boolean'],
            'chat_ids' => ['sometimes', 'array'],
            'chat_ids.*' => ['integer'],
            'image' => ['sometimes', 'nullable', 'image', 'max:5120'],
        ]);

        $text = TelegramHtml::fromRichHtml($data['message'] ?? null);
        if ($text === '') {
            $text = trim((string) ($data['message_text'] ?? ''));
        }
        // Last resort: strip tags from raw HTML message
        if ($text === '' && ! empty($data['message'])) {
            $text = trim(html_entity_decode(strip_tags((string) $data['message']), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        }
        $photoPath = null;

        if ($request->hasFile('image')) {
            $photoPath = $request->file('image')->store('broadcasts', 'public');
        }

        if ($text === '' && $photoPath === null) {
            return response()->json([
                'message' => 'Add a message or an image.',
                'errors' => ['message' => ['Add a message or an image.']],
            ], 422);
        }

        /** @var list<int>|null $chatIds */
        $chatIds = isset($data['chat_ids']) ? array_map('intval', $data['chat_ids']) : null;

        $count = $chatIds !== null
            ? count($chatIds)
            : TelegramGroup::query()->active()->count();

        if ($count === 0) {
            if ($photoPath) {
                Storage::disk('public')->delete($photoPath);
            }

            return response()->json([
                'message' => 'No groups to send to. Add the bot to a group first.',
            ], 422);
        }

        $preview = $text !== ''
            ? mb_substr(trim(html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8')), 0, 200)
            : ($photoPath ? '[Image]' : '');

        $broadcast = TelegramBroadcast::query()->create([
            'message_preview' => $preview,
            'photo_path' => $photoPath,
            'with_app_button' => (bool) ($data['with_app_button'] ?? true),
            'target_count' => $count,
            'track_code' => 'pending',
        ]);
        $broadcast->update([
            'track_code' => TelegramBroadcast::trackCodeForId($broadcast->id),
        ]);

        $job = new BroadcastTelegramGroupsJob(
            $text,
            $chatIds,
            (bool) ($data['with_app_button'] ?? true),
            $photoPath,
            $broadcast->track_code,
            $broadcast->id,
        );

        // Small batches send inline so delivery never depends on a queue worker.
        if ($count <= 25) {
            /** @var array{sent: int, failed: int, results: list<array{chat_id: int, title: ?string, ok: bool, error: ?string}>} $outcome */
            $outcome = dispatch_sync($job);

            return response()->json([
                'queued' => false,
                'broadcast_id' => $broadcast->id,
                'count' => $count,
                'sent' => $outcome['sent'] ?? 0,
                'failed' => $outcome['failed'] ?? 0,
                'has_photo' => $photoPath !== null,
                'results' => $outcome['results'] ?? [],
            ]);
        }

        dispatch($job);

        return response()->json([
            'queued' => true,
            'broadcast_id' => $broadcast->id,
            'count' => $count,
            'has_photo' => $photoPath !== null,
        ]);
    }

    public function history(Request $request): JsonResponse
    {
        $perPage = min(50, max(1, (int) $request->integer('per_page', 20)));

        $paginator = TelegramBroadcast::query()
            ->withCount('opens')
            ->latest('id')
            ->paginate($perPage);

        $data = $paginator->getCollection()->map(fn (TelegramBroadcast $b) => [
            'id' => $b->id,
            'message_preview' => $b->message_preview,
            'has_photo' => $b->photo_path !== null,
            'with_app_button' => (bool) $b->with_app_button,
            'target_count' => $b->target_count,
            'sent_count' => $b->sent_count,
            'failed_count' => $b->failed_count,
            'opens_count' => $b->opens_count,
            'track_code' => $b->track_code,
            'created_at' => optional($b->created_at)?->toIso8601String(),
        ]);

        return response()->json([
            'data' => $data,
            'meta' => [
                'total' => $paginator->total(),
                'per_page' => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    public function show(TelegramBroadcast $telegramBroadcast): JsonResponse
    {
        $telegramBroadcast->loadCount('opens');

        $opens = $telegramBroadcast->opens()
            ->with('user:id,username,first_name,last_name,telegram_id')
            ->latest('id')
            ->limit(500)
            ->get()
            ->map(fn ($open) => [
                'id' => $open->id,
                'telegram_id' => $open->telegram_id,
                'username' => $open->username,
                'first_name' => $open->first_name,
                'last_name' => $open->last_name,
                'user_id' => $open->user_id,
                'opened_at' => optional($open->created_at)?->toIso8601String(),
            ]);

        return response()->json([
            'broadcast' => [
                'id' => $telegramBroadcast->id,
                'message_preview' => $telegramBroadcast->message_preview,
                'has_photo' => $telegramBroadcast->photo_path !== null,
                'with_app_button' => (bool) $telegramBroadcast->with_app_button,
                'target_count' => $telegramBroadcast->target_count,
                'sent_count' => $telegramBroadcast->sent_count,
                'failed_count' => $telegramBroadcast->failed_count,
                'opens_count' => $telegramBroadcast->opens_count,
                'track_code' => $telegramBroadcast->track_code,
                'created_at' => optional($telegramBroadcast->created_at)?->toIso8601String(),
            ],
            'opens' => $opens,
        ]);
    }
}
