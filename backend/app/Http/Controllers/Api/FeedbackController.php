<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Feedback;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeedbackController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category' => ['required', 'in:general,bug,idea,confusing,success'],
            'rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'message' => ['required', 'string', 'min:3', 'max:2000'],
            'page' => ['nullable', 'string', 'max:255'],
            'app_version' => ['nullable', 'string', 'max:80'],
        ]);

        $feedback = Feedback::query()->create([
            ...$data,
            'user_id' => $request->user()->id,
            'status' => 'open',
        ]);

        return response()->json([
            'feedback' => [
                'id' => $feedback->id,
                'status' => $feedback->status,
            ],
        ], 201);
    }
}
