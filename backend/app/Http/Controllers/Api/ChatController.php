<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function conversations(Request $request, ChatService $chat): JsonResponse
    {
        return response()->json([
            'data' => $chat->conversations($request->user()),
        ]);
    }

    public function badges(Request $request, ChatService $chat): JsonResponse
    {
        return response()->json($chat->badges($request->user()));
    }

    public function index(Request $request, int $matchId, ChatService $chat): JsonResponse
    {
        // Polling uses mark_seen=0 so we don't re-run delivered/read side-effects every 1–2s.
        $markSeen = ! $request->has('mark_seen') || $request->boolean('mark_seen');

        return response()->json([
            'data' => $chat->messages($request->user(), $matchId, $markSeen),
            'settings' => $chat->settings($request->user(), $matchId),
        ]);
    }

    public function store(Request $request, int $matchId, ChatService $chat): JsonResponse
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'min:1', 'max:2000'],
        ]);

        $message = $chat->send($request->user(), $matchId, $data['body']);

        return response()->json(['message' => $message], 201);
    }

    public function delivered(Request $request, int $matchId, ChatService $chat): JsonResponse
    {
        $data = $request->validate([
            'message_ids' => ['sometimes', 'array'],
            'message_ids.*' => ['integer'],
        ]);

        return response()->json([
            'data' => $chat->markDelivered($request->user(), $matchId, $data['message_ids'] ?? null),
        ]);
    }

    public function read(Request $request, int $matchId, ChatService $chat): JsonResponse
    {
        return response()->json([
            'data' => $chat->markRead($request->user(), $matchId),
        ]);
    }

    public function typing(Request $request, int $matchId, ChatService $chat): JsonResponse
    {
        $data = $request->validate([
            'typing' => ['required', 'boolean'],
        ]);

        $chat->typing($request->user(), $matchId, (bool) $data['typing']);

        return response()->json(['ok' => true]);
    }

    public function typingStatus(Request $request, int $matchId, ChatService $chat): JsonResponse
    {
        return response()->json([
            'typing' => $chat->peerTyping($request->user(), $matchId),
        ]);
    }

    public function presence(Request $request, int $matchId, ChatService $chat): JsonResponse
    {
        $chat->markPresence($request->user(), $matchId);

        return response()->json(['ok' => true]);
    }

    public function settings(Request $request, int $matchId, ChatService $chat): JsonResponse
    {
        return response()->json([
            'settings' => $chat->settings($request->user(), $matchId),
        ]);
    }

    public function updateSettings(Request $request, int $matchId, ChatService $chat): JsonResponse
    {
        $data = $request->validate([
            'muted' => ['required', 'boolean'],
        ]);

        return response()->json([
            'settings' => $chat->updateSettings($request->user(), $matchId, $data),
        ]);
    }

    public function proposeDate(Request $request, int $matchId, ChatService $chat): JsonResponse
    {
        $data = $request->validate([
            'scheduled_at' => ['required', 'date', 'after:now'],
            'place' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $result = $chat->proposeDate($request->user(), $matchId, $data);

        return response()->json($result, 201);
    }

    public function respondDate(Request $request, int $matchId, int $dateId, ChatService $chat): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:accepted,declined,cancelled'],
        ]);

        return response()->json(
            $chat->respondDate($request->user(), $matchId, $dateId, $data['status'])
        );
    }

    public function unmatch(Request $request, int $matchId, ChatService $chat): JsonResponse
    {
        $chat->unmatch($request->user(), $matchId);

        return response()->json(['ok' => true]);
    }
}
