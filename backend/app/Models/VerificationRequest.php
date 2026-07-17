<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class VerificationRequest extends Model
{
    protected $fillable = [
        'user_id',
        'selfie_url',
        'path',
        'status',
        'reviewed_at',
        'reviewed_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'reviewed_by');
    }

    protected function selfieUrl(): Attribute
    {
        return Attribute::get(function (?string $value) {
            if ($this->path) {
                $disk = config('filesystems.cupid_disk', 'public');
                try {
                    if (Storage::disk($disk)->exists($this->path)) {
                        if ($disk === 's3' || $disk === 'r2') {
                            // Selfies are sensitive — prefer a short-lived signed URL
                            try {
                                return Storage::disk($disk)->temporaryUrl($this->path, now()->addMinutes(30));
                            } catch (\Throwable) {
                                return Storage::disk($disk)->url($this->path);
                            }
                        }

                        return Storage::disk('public')->url($this->path);
                    }
                } catch (\Throwable) {
                    // Fall through
                }
            }

            if (is_string($value) && str_starts_with($value, 'http') && ! str_contains($value, '/storage/')) {
                return $value;
            }

            return null;
        });
    }
}
