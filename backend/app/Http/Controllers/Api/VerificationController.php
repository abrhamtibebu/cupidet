<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class VerificationController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'selfie' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
        ]);

        $user = $request->user();
        $file = $request->file('selfie');
        $path = $file->store('verification/'.$user->id, $this->disk());
        $url = $this->urlFor($path);

        $requestModel = $user->verificationRequests()->create([
            'selfie_url' => $url,
            'path' => $path,
            'status' => 'pending',
        ]);

        if ($user->verified) {
            $user->forceFill(['verified' => false])->save();
        }

        return response()->json([
            'verification_request' => [
                'id' => $requestModel->id,
                'status' => $requestModel->status,
                'selfie_url' => $requestModel->selfie_url,
                'created_at' => optional($requestModel->created_at)?->toIso8601String(),
                'reviewed_at' => null,
                'notes' => null,
            ],
            'message' => 'Selfie submitted. Admin review usually takes 2 to 48 hours.',
        ], 201);
    }

    private function disk(): string
    {
        return config('filesystems.cupid_disk', 'public');
    }

    private function urlFor(string $path): string
    {
        $disk = $this->disk();
        if ($disk === 's3' || $disk === 'r2') {
            return Storage::disk($disk)->url($path);
        }

        return Storage::disk('public')->url($path);
    }
}
