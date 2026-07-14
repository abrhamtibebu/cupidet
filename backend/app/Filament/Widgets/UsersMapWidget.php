<?php

namespace App\Filament\Widgets;

use App\Models\Profile;
use Filament\Widgets\Widget;
use Illuminate\Support\Collection;

class UsersMapWidget extends Widget
{
    protected static ?int $sort = 2;

    protected string $view = 'filament.widgets.users-map';

    protected int | string | array $columnSpan = [
        'default' => 'full',
        'md' => 'full',
        'xl' => 2,
    ];

    /**
     * @return Collection<int, array{lat: float, lng: float, name: string, location: string}>
     */
    public function getPoints(): Collection
    {
        return Profile::query()
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->orderByDesc('updated_at')
            ->limit(200)
            ->get(['name', 'location', 'latitude', 'longitude'])
            ->map(fn (Profile $profile): array => [
                'lat' => (float) $profile->latitude,
                'lng' => (float) $profile->longitude,
                'name' => (string) ($profile->name ?: 'User'),
                'location' => (string) ($profile->location ?: 'Ethiopia'),
            ])
            ->values();
    }
}
