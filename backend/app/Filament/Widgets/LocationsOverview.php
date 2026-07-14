<?php

namespace App\Filament\Widgets;

use App\Models\Profile;
use Filament\Widgets\Widget;

class LocationsOverview extends Widget
{
    protected static ?int $sort = 4;

    protected string $view = 'filament.widgets.locations-overview';

    protected int | string | array $columnSpan = 'full';

    /**
     * @return array<int, array{name: string, count: int, color: string}>
     */
    public function getLocations(): array
    {
        $palette = ['#ef2d7a', '#8b5cf6', '#22c55e', '#f59e0b', '#0ea5e9', '#f43f5e', '#14b8a6', '#a855f7'];

        return Profile::query()
            ->selectRaw('location, COUNT(*) as aggregate')
            ->whereNotNull('location')
            ->where('location', '!=', '')
            ->groupBy('location')
            ->orderByDesc('aggregate')
            ->limit(8)
            ->get()
            ->values()
            ->map(fn ($row, int $index): array => [
                'name' => (string) $row->location,
                'count' => (int) $row->aggregate,
                'color' => $palette[$index % count($palette)],
            ])
            ->all();
    }
}
