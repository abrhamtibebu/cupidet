<?php

namespace App\Filament\Support;

use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardMetrics
{
    protected static function dayExpression(string $dateColumn): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "strftime('%Y-%m-%d', {$dateColumn})",
            default => "DATE({$dateColumn})",
        };
    }

    /**
     * @return array<float>
     */
    public static function dailyCounts(Builder $query, string $dateColumn = 'created_at', int $days = 14): array
    {
        $from = now()->subDays($days - 1)->startOfDay();
        $dayExpr = static::dayExpression($dateColumn);

        $rows = (clone $query)
            ->where($dateColumn, '>=', $from)
            ->selectRaw("{$dayExpr} as day, COUNT(*) as aggregate")
            ->groupBy('day')
            ->pluck('aggregate', 'day');

        $series = [];
        foreach (CarbonPeriod::create($from, now()->endOfDay()) as $date) {
            $key = $date->toDateString();
            $series[] = (float) ($rows[$key] ?? 0);
        }

        return $series;
    }

    /**
     * @return array{labels: list<string>, values: list<int>}
     */
    public static function dailySeries(Builder $query, string $dateColumn = 'created_at', int $days = 15): array
    {
        $from = now()->subDays($days - 1)->startOfDay();
        $dayExpr = static::dayExpression($dateColumn);

        $rows = (clone $query)
            ->where($dateColumn, '>=', $from)
            ->selectRaw("{$dayExpr} as day, COUNT(*) as aggregate")
            ->groupBy('day')
            ->pluck('aggregate', 'day');

        $labels = [];
        $values = [];

        foreach (CarbonPeriod::create($from, now()->endOfDay()) as $date) {
            /** @var Carbon $date */
            $key = $date->toDateString();
            $labels[] = $date->format('M d');
            $values[] = (int) ($rows[$key] ?? 0);
        }

        return [
            'labels' => $labels,
            'values' => $values,
        ];
    }
}
