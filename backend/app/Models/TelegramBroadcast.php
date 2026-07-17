<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TelegramBroadcast extends Model
{
    protected $fillable = [
        'message_preview',
        'photo_path',
        'with_app_button',
        'target_count',
        'sent_count',
        'failed_count',
        'track_code',
    ];

    protected function casts(): array
    {
        return [
            'with_app_button' => 'boolean',
            'target_count' => 'integer',
            'sent_count' => 'integer',
            'failed_count' => 'integer',
        ];
    }

    public function opens(): HasMany
    {
        return $this->hasMany(TelegramBroadcastOpen::class, 'broadcast_id');
    }

    public static function trackCodeForId(int $id): string
    {
        return 'bc'.$id;
    }

    public static function idFromTrackCode(string $trackCode): ?int
    {
        if (preg_match('/^bc(\d+)$/', $trackCode, $m)) {
            return (int) $m[1];
        }

        return null;
    }
}
