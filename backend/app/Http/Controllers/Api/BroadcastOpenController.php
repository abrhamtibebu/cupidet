<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TelegramBroadcastTrackingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BroadcastOpenController extends Controller
{
    public function store(Request $request, TelegramBroadcastTrackingService $tracking): JsonResponse
    {
        $data = $request->validate([
            'start_param' => ['required', 'string', 'max:64'],
        ]);

        $user = $request->user();
        $tracking->recordOpen(
            $data['start_param'],
            $user,
            [
                'id' => $user->telegram_id,
                'username' => $user->username,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
            ],
        );

        return response()->json(['ok' => true]);
    }
}
