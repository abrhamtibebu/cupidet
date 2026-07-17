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

        $makePrimary = $request->boolean('is_primary') || ! $user->photos()->exists();

        if ($makePrimary) {
            $user->photos()->update(['is_primary' => false]);
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

        // On ephemeral local disk, prefer the media proxy so clients survive redeploys better
        // once a CDN fallback exists; for uploads the proxy still streams while the file lives.
        if ($this->disk() === 'public') {
            $photo->update(['image_url' => url('/api/media/photos/'.$photo->id)]);
            if ($makePrimary) {
                $user->forceFill(['photo_url' => url('/api/media/photos/'.$photo->id)])->save();
            }
            $photo = $photo->fresh();
        }

        return response()->json(['photo' => $photo], 201);
    }

    public function setPrimary(Request $request, Photo $photo): JsonResponse
    {
        $this->authorizePhoto($request, $photo);

        $request->user()->photos()->update(['is_primary' => false]);
        $photo->update(['is_primary' => true]);
        $request->user()->forceFill(['photo_url' => $photo->image_url])->save();

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
            $next = $request->user()->photos()->latest()->first();
            if ($next) {
                $next->update(['is_primary' => true]);
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
