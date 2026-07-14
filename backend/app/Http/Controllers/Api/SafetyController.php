<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Block;
use App\Models\Like;
use App\Models\MatchModel;
use App\Models\Report;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SafetyController extends Controller
{
    public function report(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'reason' => ['required', Rule::in(['fake_profile', 'harassment', 'spam', 'inappropriate_content'])],
            'details' => ['nullable', 'string', 'max:1000'],
        ]);

        abort_if($data['user_id'] === $request->user()->id, 422, 'Cannot report yourself.');

        $report = Report::query()->create([
            'reporter_id' => $request->user()->id,
            'reported_user_id' => $data['user_id'],
            'reason' => $data['reason'],
            'details' => $data['details'] ?? null,
            'status' => 'open',
        ]);

        return response()->json(['report' => $report], 201);
    }

    public function block(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        abort_if($data['user_id'] === $request->user()->id, 422, 'Cannot block yourself.');

        $block = Block::query()->firstOrCreate([
            'blocker_id' => $request->user()->id,
            'blocked_id' => $data['user_id'],
        ]);

        Like::query()
            ->where(function ($q) use ($request, $data) {
                $q->where('sender_id', $request->user()->id)->where('receiver_id', $data['user_id']);
            })
            ->orWhere(function ($q) use ($request, $data) {
                $q->where('sender_id', $data['user_id'])->where('receiver_id', $request->user()->id);
            })
            ->delete();

        [$one, $two] = MatchModel::orderedPair($request->user()->id, (int) $data['user_id']);
        MatchModel::query()->where('user_one', $one)->where('user_two', $two)->delete();

        return response()->json(['block' => $block], 201);
    }

    public function unblock(Request $request, int $userId): JsonResponse
    {
        Block::query()
            ->where('blocker_id', $request->user()->id)
            ->where('blocked_id', $userId)
            ->delete();

        return response()->json(['message' => 'User unblocked.']);
    }
}
