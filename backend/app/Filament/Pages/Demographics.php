<?php

namespace App\Filament\Pages;

use App\Models\Profile;
use BackedEnum;
use Filament\Pages\Page;
use Illuminate\Contracts\Support\Htmlable;
use Illuminate\Support\Collection;

class Demographics extends Page
{
    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-globe-alt';

    protected static ?string $navigationLabel = 'Demographics';

    protected static ?string $slug = 'demographics';

    protected static ?string $title = 'Demographics';

    protected static ?int $navigationSort = 4;

    protected string $view = 'filament.pages.demographics';

    public function getHeading(): string | Htmlable
    {
        return 'Demographics';
    }

    public function getSubheading(): string | Htmlable | null
    {
        return 'Where your Habesha community lives.';
    }

    /**
     * @return Collection<int, array{name: string, count: int, color: string, percent: float}>
     */
    public function getLocations(): Collection
    {
        $palette = ['#dffc01', '#0a0a0a', '#38bdf8', '#f59e0b', '#22c55e', '#a3a3a3', '#c5e000', '#525252'];
        $total = max(1, (int) Profile::query()->whereNotNull('location')->where('location', '!=', '')->count());

        return Profile::query()
            ->selectRaw('location, COUNT(*) as aggregate')
            ->whereNotNull('location')
            ->where('location', '!=', '')
            ->groupBy('location')
            ->orderByDesc('aggregate')
            ->limit(12)
            ->get()
            ->values()
            ->map(fn ($row, int $index): array => [
                'name' => (string) $row->location,
                'count' => (int) $row->aggregate,
                'color' => $palette[$index % count($palette)],
                'percent' => round(((int) $row->aggregate / $total) * 100, 1),
            ]);
    }
}
