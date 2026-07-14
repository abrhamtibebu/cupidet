<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DiscoveryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DiscoverController extends Controller
{
    public function index(Request $request, DiscoveryService $discovery): JsonResponse
    {
        $user = $request->user()->load(['profile', 'interests', 'preferences']);
        $limit = min((int) $request->query('limit', 40), 50);
        $users = $discovery->feed($user, $limit);

        return response()->json([
            'data' => $users->map(fn ($u) => $discovery->cardPayload($u, $user))->values(),
        ]);
    }
}
