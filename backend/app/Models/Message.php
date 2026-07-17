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
        'delivered_at',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'delivered_at' => 'datetime',
            'read_at' => 'datetime',
        ];
    }

    /**
     * Transparently decrypt legacy server-side (Laravel Crypt) message bodies on read.
     *
     * Old builds stored bodies with Crypt (server could read them). New messages are
     * end-to-end encrypted on the client (`enc1:` envelope) and are left untouched here,
     * so the server/admin can never read them.
     */
    protected function body(): Attribute
    {
        return Attribute::make(
            get: function (?string $value): ?string {
                if ($value === null || $value === '') {
                    return $value;
                }

                // True E2E payloads are opaque to the server — never attempt to read them.
                if (str_starts_with($value, 'enc1:')) {
                    return $value;
                }

                // Legacy Laravel Crypt payloads are base64 JSON with an "iv" field.
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
