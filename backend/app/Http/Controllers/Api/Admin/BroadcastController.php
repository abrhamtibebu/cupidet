<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\BroadcastTelegramGroupsJob;
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
            'with_app_button' => ['sometimes', 'boolean'],
            'chat_ids' => ['sometimes', 'array'],
            'chat_ids.*' => ['integer'],
            'image' => ['sometimes', 'nullable', 'image', 'max:5120'],
        ]);

        $text = TelegramHtml::fromRichHtml($data['message'] ?? null);
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

        $job = new BroadcastTelegramGroupsJob(
            $text,
            $chatIds,
            (bool) ($data['with_app_button'] ?? true),
            $photoPath,
        );

        // Small batches send inline so delivery never depends on a queue worker.
        if ($count <= 25) {
            dispatch_sync($job);
        } else {
            dispatch($job);
        }

        return response()->json([
            'queued' => true,
            'count' => $count,
            'has_photo' => $photoPath !== null,
        ]);
    }
}
