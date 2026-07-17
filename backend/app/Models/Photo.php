<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Photo extends Model
{
    protected $fillable = [
        'user_id',
        'image_url',
        'path',
        'is_primary',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Prefer a file that still exists on disk; otherwise a durable CDN URL.
     * Never emit a dead /storage path or a Telegram bot-token file URL.
     */
    protected function imageUrl(): Attribute
    {
        return Attribute::get(function (?string $value) {
            if ($this->path) {
                $disk = config('filesystems.cupid_disk', 'public');
                try {
                    if (Storage::disk($disk)->exists($this->path)) {
                        if ($disk === 's3' || $disk === 'r2') {
                            return Storage::disk($disk)->url($this->path);
                        }

                        return Storage::disk('public')->url($this->path);
                    }
                } catch (\Throwable) {
                    // fall through to durable fallbacks
                }
            }

            $candidates = [
                $this->user?->photo_url,
                $value,
            ];

            foreach ($candidates as $candidate) {
                if ($this->isDurablePublicUrl($candidate)) {
                    return $candidate;
                }
            }

            // Proxy can stream from disk, redirect to CDN, or re-fetch Telegram
            if ($this->id) {
                return url('/api/media/photos/'.$this->id);
            }

            return null;
        });
    }

    private function isDurablePublicUrl(?string $url): bool
    {
        if (! is_string($url) || $url === '' || ! str_starts_with($url, 'http')) {
            return false;
        }

        if (str_contains($url, '/storage/')) {
            return false;
        }

        // Self-referential media proxy is not a durable CDN source
        if (str_contains($url, '/api/media/photos/')) {
            return false;
        }

        // Bot-token file URLs expire and leak the token — never expose to clients
        if (str_contains($url, 'api.telegram.org') && str_contains($url, '/file/bot')) {
            return false;
        }

        return true;
    }
}
