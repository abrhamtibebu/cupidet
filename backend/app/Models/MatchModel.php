<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MatchModel extends Model
{
    protected $table = 'matches';

    protected $fillable = [
        'user_one',
        'user_two',
        'matched_at',
    ];

    protected function casts(): array
    {
        return [
            'matched_at' => 'datetime',
        ];
    }

    public function userOne(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_one');
    }

    public function userTwo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_two');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class, 'match_id');
    }

    public function otherUser(int $userId): User
    {
        return (int) $this->user_one === $userId ? $this->userTwo : $this->userOne;
    }

    public function involves(int $userId): bool
    {
        return (int) $this->user_one === $userId || (int) $this->user_two === $userId;
    }

    public static function orderedPair(int $a, int $b): array
    {
        return $a < $b ? [$a, $b] : [$b, $a];
    }
}
