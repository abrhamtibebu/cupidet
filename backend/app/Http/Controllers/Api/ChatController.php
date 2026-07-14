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
        return response()->json([
            'data' => $chat->messages($request->user(), $matchId),
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

    public function presence(Request $request, int $matchId, ChatService $chat): JsonResponse
    {
        $chat->markPresence($request->user(), $matchId);

        return response()->json(['ok' => true]);
    }
}
