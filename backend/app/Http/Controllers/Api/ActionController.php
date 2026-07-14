<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DiscoveryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActionController extends Controller
{
    public function like(Request $request, DiscoveryService $discovery): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'type' => ['sometimes', 'in:like,super'],
        ]);

        $result = $discovery->like(
            $request->user(),
            (int) $data['user_id'],
            $data['type'] ?? 'like'
        );

        return response()->json($result);
    }

    public function pass(Request $request, DiscoveryService $discovery): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $pass = $discovery->pass($request->user(), (int) $data['user_id']);

        return response()->json(['pass' => $pass]);
    }

    public function rewind(Request $request, DiscoveryService $discovery): JsonResponse
    {
        return response()->json($discovery->rewind($request->user()));
    }

    public function matches(Request $request, DiscoveryService $discovery): JsonResponse
    {
        return response()->json([
            'data' => $discovery->matches($request->user()),
        ]);
    }

    public function likesReceived(Request $request, DiscoveryService $discovery): JsonResponse
    {
        return response()->json([
            'data' => $discovery->likesReceived($request->user()),
        ]);
    }
}
