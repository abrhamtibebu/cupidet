<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Photo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Serves dating photos even when static /storage files are missing
 * (Render ephemeral disk) by streaming from disk or redirecting to a CDN URL.
 */
class MediaController extends Controller
{
    public function photo(Request $request, Photo $photo): Response|StreamedResponse
    {
        $disk = config('filesystems.cupid_disk', 'public');

        if ($photo->path) {
            try {
                if (Storage::disk($disk)->exists($photo->path)) {
                    $mime = Storage::disk($disk)->mimeType($photo->path) ?: 'image/jpeg';

                    return response()->stream(function () use ($disk, $photo) {
                        echo Storage::disk($disk)->get($photo->path);
                    }, 200, [
                        'Content-Type' => $mime,
                        'Cache-Control' => 'public, max-age=86400',
                    ]);
                }
            } catch (\Throwable) {
                // fall through
            }
        }

        // Missing file: only heal approved discover photos (CDN / Telegram)
        if ($photo->status !== 'approved') {
            abort(404);
        }

        $redirect = $this->durableRedirect($photo);
        if ($redirect) {
            return redirect()->away($redirect, 302);
        }

        // Last resort: re-fetch Telegram profile photo server-side and stream it
        $user = $photo->user;
        if ($user?->telegram_id) {
            $streamed = $this->streamTelegramProfilePhoto((int) $user->telegram_id);
            if ($streamed) {
                return $streamed;
            }
        }

        abort(404);
    }

    private function durableRedirect(Photo $photo): ?string
    {
        $candidates = [
            $photo->user?->photo_url,
            $photo->getRawOriginal('image_url'),
        ];

        foreach ($candidates as $url) {
            if (! is_string($url) || ! str_starts_with($url, 'http')) {
                continue;
            }
            if (str_contains($url, '/storage/')) {
                continue;
            }
            if (str_contains($url, '/api/media/photos/')) {
                continue;
            }
            if (str_contains($url, 'api.telegram.org') && str_contains($url, '/file/bot')) {
                continue;
            }

            return $url;
        }

        return null;
    }

    private function streamTelegramProfilePhoto(int $telegramId): ?StreamedResponse
    {
        $token = config('services.telegram.bot_token');
        if (! $token || $telegramId <= 0) {
            return null;
        }

        try {
            $photos = Http::timeout(8)->get("https://api.telegram.org/bot{$token}/getUserProfilePhotos", [
                'user_id' => $telegramId,
                'limit' => 1,
            ])->json();

            $sizes = $photos['result']['photos'][0] ?? null;
            if (! is_array($sizes) || $sizes === []) {
                return null;
            }

            $best = collect($sizes)->sortByDesc(fn ($size) => (int) ($size['file_size'] ?? 0))->first();
            $fileId = $best['file_id'] ?? null;
            if (! $fileId) {
                return null;
            }

            $file = Http::timeout(8)->get("https://api.telegram.org/bot{$token}/getFile", [
                'file_id' => $fileId,
            ])->json();

            $filePath = $file['result']['file_path'] ?? null;
            if (! $filePath) {
                return null;
            }

            $binary = Http::timeout(12)->get("https://api.telegram.org/file/bot{$token}/{$filePath}");
            if (! $binary->successful() || strlen($binary->body()) < 100) {
                return null;
            }

            $body = $binary->body();

            return response()->stream(function () use ($body) {
                echo $body;
            }, 200, [
                'Content-Type' => 'image/jpeg',
                'Cache-Control' => 'public, max-age=3600',
            ]);
        } catch (\Throwable) {
            return null;
        }
    }
}
