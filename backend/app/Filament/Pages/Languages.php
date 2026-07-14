<?php

namespace App\Filament\Pages;

use App\Models\Interest;
use App\Models\Profile;
use BackedEnum;
use Filament\Pages\Page;
use Illuminate\Contracts\Support\Htmlable;
use Illuminate\Support\Collection;

class Languages extends Page
{
    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-language';

    protected static ?string $navigationLabel = 'Languages';

    protected static ?string $slug = 'languages';

    protected static ?string $title = 'Languages';

    protected static ?int $navigationSort = 6;

    protected string $view = 'filament.pages.languages';

    public function getHeading(): string | Htmlable
    {
        return 'Languages';
    }

    public function getSubheading(): string | Htmlable | null
    {
        return 'Spoken languages and top interests across profiles.';
    }

    /**
     * @return Collection<int, array{name: string, count: int}>
     */
    public function getLanguages(): Collection
    {
        $counts = collect(config('cupid.languages', []))
            ->mapWithKeys(fn (string $lang): array => [$lang => 0]);

        Profile::query()
            ->whereNotNull('languages')
            ->pluck('languages')
            ->each(function ($langs) use (&$counts): void {
                foreach ((array) $langs as $lang) {
                    if ($counts->has($lang)) {
                        $counts[$lang] = $counts[$lang] + 1;
                    }
                }
            });

        return $counts
            ->map(fn (int $count, string $name): array => compact('name', 'count'))
            ->values()
            ->sortByDesc('count')
            ->values();
    }

    /**
     * @return Collection<int, array{name: string, count: int}>
     */
    public function getInterests(): Collection
    {
        return Interest::query()
            ->withCount('users')
            ->orderByDesc('users_count')
            ->limit(12)
            ->get()
            ->map(fn (Interest $interest): array => [
                'name' => $interest->name,
                'count' => (int) $interest->users_count,
            ]);
    }
}
