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

    public function isTelegramSynced(): bool
    {
        if (is_string($this->path) && str_contains($this->path, 'telegram_')) {
            return true;
        }

        $url = (string) ($this->attributes['image_url'] ?? '');

        return str_contains($url, 'api.telegram.org') || str_contains($url, 't.me/');
    }

    /**
     * Rebuild public URLs from the current APP_URL / disk when the file exists.
     * User uploads must never fall back to Telegram initials/CDN URLs.
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
                    // fall through
                }

                // Prefer the URL we stored at upload time
                if (is_string($value) && $value !== '') {
                    return $value;
                }

                // Only Telegram-synced rows may fall back to users.photo_url
                if ($this->isTelegramSynced()) {
                    $fallback = $this->user?->photo_url;
                    if (is_string($fallback) && str_starts_with($fallback, 'http')) {
                        return $fallback;
                    }
                }
            }

            return $value;
        });
    }
}
