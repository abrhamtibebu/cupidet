<?php

namespace App\Filament\Widgets;

use App\Filament\Pages\NewOnline;
use App\Filament\Resources\Matches\MatchResource;
use App\Filament\Support\DashboardMetrics;
use App\Models\Like;
use App\Models\MatchModel;
use App\Models\User;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class StatsOverview extends StatsOverviewWidget
{
    protected ?string $heading = null;

    protected ?string $description = null;

    protected static ?int $sort = 1;

    protected int | string | array $columnSpan = [
        'default' => 'full',
        'md' => 'full',
        'xl' => 2,
    ];

    /**
     * @return int | array<string, ?int>
     */
    protected function getColumns(): int | array
    {
        return [
            'default' => 1,
            'sm' => 2,
            'xl' => 3,
        ];
    }

    protected function getStats(): array
    {
        $totalUsers = User::query()->count();
        $activeUsers = User::query()->where('last_active', '>=', now()->subDays(7))->count();
        $matches = MatchModel::query()->count();
        $likes = Like::query()->count();

        return [
            Stat::make('Total users', number_format($totalUsers))
                ->description('All registered accounts')
                ->chart(DashboardMetrics::dailyCounts(User::query(), days: 14))
                ->color('primary')
                ->url(NewOnline::getUrl()),
            Stat::make('Active (7d)', number_format($activeUsers))
                ->description('Recently online')
                ->chart(DashboardMetrics::dailyCounts(
                    User::query()->whereNotNull('last_active'),
                    'last_active',
                    14,
                ))
                ->color('success')
                ->url(NewOnline::getUrl()),
            Stat::make('Matches', number_format($matches))
                ->description(number_format($likes).' likes all-time')
                ->chart(DashboardMetrics::dailyCounts(
                    MatchModel::query(),
                    'matched_at',
                    14,
                ))
                ->color('warning')
                ->url(MatchResource::getUrl('index')),
        ];
    }
}
