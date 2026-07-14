<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'telegram_id',
        'username',
        'first_name',
        'last_name',
        'photo_url',
        'password',
        'status',
        'verified',
        'last_active',
        'notify_matches',
        'notify_likes',
        'notify_messages',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'telegram_id' => 'integer',
            'verified' => 'boolean',
            'last_active' => 'datetime',
            'password' => 'hashed',
            'notify_matches' => 'boolean',
            'notify_likes' => 'boolean',
            'notify_messages' => 'boolean',
        ];
    }

    public function profile(): HasOne
    {
        return $this->hasOne(Profile::class);
    }

    public function photos(): HasMany
    {
        return $this->hasMany(Photo::class);
    }

    public function primaryPhoto(): HasOne
    {
        return $this->hasOne(Photo::class)->where('is_primary', true);
    }

    public function interests(): BelongsToMany
    {
        return $this->belongsToMany(Interest::class, 'user_interests');
    }

    public function preferences(): HasOne
    {
        return $this->hasOne(Preference::class);
    }

    public function prompts(): HasMany
    {
        return $this->hasMany(ProfilePrompt::class);
    }

    public function likesSent(): HasMany
    {
        return $this->hasMany(Like::class, 'sender_id');
    }

    public function likesReceived(): HasMany
    {
        return $this->hasMany(Like::class, 'receiver_id');
    }

    public function passesSent(): HasMany
    {
        return $this->hasMany(Pass::class, 'sender_id');
    }

    public function blocksSent(): HasMany
    {
        return $this->hasMany(Block::class, 'blocker_id');
    }

    public function blocksReceived(): HasMany
    {
        return $this->hasMany(Block::class, 'blocked_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function hasCompletedProfile(): bool
    {
        return $this->profile !== null
            && $this->interests()->exists()
            && $this->preferences !== null;
    }

    public function age(): ?int
    {
        return $this->profile?->birth_date?->age;
    }

    public function displayName(): string
    {
        return $this->profile?->name
            ?? trim(($this->first_name ?? '').' '.($this->last_name ?? ''))
            ?: ($this->username ?? 'User');
    }
}
