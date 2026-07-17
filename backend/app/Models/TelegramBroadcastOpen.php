<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramBroadcastOpen extends Model
{
    protected $fillable = [
        'broadcast_id',
        'user_id',
        'telegram_id',
        'username',
        'first_name',
        'last_name',
    ];

    protected function casts(): array
    {
        return [
            'broadcast_id' => 'integer',
            'user_id' => 'integer',
            'telegram_id' => 'integer',
        ];
    }

    public function broadcast(): BelongsTo
    {
        return $this->belongsTo(TelegramBroadcast::class, 'broadcast_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
