<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;

class Message extends Model
{
    protected $fillable = [
        'match_id',
        'sender_id',
        'body',
        'type',
        'meta',
        'delivered_at',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'delivered_at' => 'datetime',
            'read_at' => 'datetime',
        ];
    }

    /**
     * Decrypt legacy Laravel Crypt payloads so older chats still display as plaintext.
     */
    protected function body(): Attribute
    {
        return Attribute::make(
            get: function (?string $value): ?string {
                if ($value === null || $value === '') {
                    return $value;
                }

                // Leftover client E2E (should already be migrated, but keep safe).
                if (str_starts_with($value, 'enc1:')) {
                    return 'This older encrypted message could not be recovered.';
                }

                $decoded = base64_decode($value, true);
                if ($decoded === false || ! str_starts_with($decoded, '{"iv"')) {
                    return $value;
                }

                try {
                    return Crypt::decryptString($value);
                } catch (\Throwable) {
                    return $value;
                }
            },
        );
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(MatchModel::class, 'match_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
