<?php

namespace App\Http\Controllers;

use App\Services\TelegramBotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelegramWebhookController extends Controller
{
    public function __invoke(Request $request, TelegramBotService $bot): JsonResponse
    {
        $secret = config('services.telegram.webhook_secret');
        if ($secret && $request->header('X-Telegram-Bot-Api-Secret-Token') !== $secret) {
            abort(403);
        }

        $bot->handleUpdate($request->all());

        return response()->json(['ok' => true]);
    }
}
