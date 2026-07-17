<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Photo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PhotoController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
            'is_primary' => ['sometimes', 'boolean'],
        ]);

        $user = $request->user();
        $file = $request->file('photo');
        $path = $file->store('photos/'.$user->id, $this->disk());
        $url = $this->urlFor($path);

        $makePrimary = $request->boolean('is_primary') || ! $user->photos()
            ->whereNotNull('path')
            ->where('path', 'not like', '%telegram_%')
            ->exists();

        if ($makePrimary) {
            $user->photos()->update(['is_primary' => false]);
            // Drop Telegram placeholders once the user uploads a real photo
            $user->photos()
                ->where(function ($q) {
                    $q->where('path', 'like', '%telegram_%')
                        ->orWhere(function ($inner) {
                            $inner->whereNull('path')
                                ->where(function ($urlQ) {
                                    $urlQ->where('image_url', 'like', '%api.telegram.org%')
                                        ->orWhere('image_url', 'like', '%t.me/%');
                                });
                        });
                })
                ->delete();
        }

        $photo = $user->photos()->create([
            'image_url' => $url,
            'path' => $path,
            'is_primary' => $makePrimary,
            'status' => config('cupid.auto_approve_photos') ? 'approved' : 'pending',
        ]);

        if ($makePrimary) {
            $user->forceFill(['photo_url' => $url])->save();
        }

        return response()->json(['photo' => $photo], 201);
    }

    public function setPrimary(Request $request, Photo $photo): JsonResponse
    {
        $this->authorizePhoto($request, $photo);

        $request->user()->photos()->update(['is_primary' => false]);
        $photo->update(['is_primary' => true]);

        $url = $photo->getAttributes()['image_url'] ?? $photo->image_url;
        if (is_string($url) && $url !== '') {
            $request->user()->forceFill(['photo_url' => $url])->save();
        }

        return response()->json(['photo' => $photo->fresh()]);
    }

    public function destroy(Request $request, Photo $photo): JsonResponse
    {
        $this->authorizePhoto($request, $photo);

        if ($photo->path) {
            Storage::disk($this->disk())->delete($photo->path);
        }

        $wasPrimary = $photo->is_primary;
        $photo->delete();

        if ($wasPrimary) {
            $next = $request->user()->photos()
                ->whereNotNull('path')
                ->where('path', 'not like', '%telegram_%')
                ->latest()
                ->first()
                ?? $request->user()->photos()->latest()->first();

            if ($next) {
                $next->update(['is_primary' => true]);
                $url = $next->getAttributes()['image_url'] ?? $next->image_url;
                if (is_string($url) && $url !== '') {
                    $request->user()->forceFill(['photo_url' => $url])->save();
                }
            } else {
                $request->user()->forceFill(['photo_url' => null])->save();
            }
        }

        return response()->json(['message' => 'Photo deleted.']);
    }

    private function authorizePhoto(Request $request, Photo $photo): void
    {
        abort_unless($photo->user_id === $request->user()->id, 403);
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
