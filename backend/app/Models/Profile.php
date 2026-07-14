<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Profile extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'birth_date',
        'gender',
        'location',
        'latitude',
        'longitude',
        'bio',
        'relationship_goal',
        'height_cm',
        'education',
        'occupation',
        'religion',
        'languages',
        'children',
        'pets',
        'drinking',
        'smoking',
        'hobbies',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'latitude' => 'float',
            'longitude' => 'float',
            'height_cm' => 'integer',
            'languages' => 'array',
            'hobbies' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
