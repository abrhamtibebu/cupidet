<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Preference extends Model
{
    protected $fillable = [
        'user_id',
        'preferred_gender',
        'min_age',
        'max_age',
        'preferred_location',
        'max_distance_km',
        'preferred_languages',
        'preferred_interest_ids',
    ];

    protected function casts(): array
    {
        return [
            'min_age' => 'integer',
            'max_age' => 'integer',
            'max_distance_km' => 'integer',
            'preferred_languages' => 'array',
            'preferred_interest_ids' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
