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
     * Rebuild public URLs from the current APP_URL / disk when the file exists.
     * If the file was lost (ephemeral Render disk), fall back to the Telegram CDN URL on the user.
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

                $fallback = $this->user?->photo_url;
                if (is_string($fallback) && str_starts_with($fallback, 'http')) {
                    return $fallback;
                }
            }

            return $value;
        });
    }
}
