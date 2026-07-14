<?php

namespace App\Filament\Widgets;

use App\Filament\Support\DashboardMetrics;
use App\Models\Like;
use App\Models\User;
use Filament\Widgets\ChartWidget;

class ActivityChart extends ChartWidget
{
    protected ?string $heading = 'Signups';

    protected ?string $description = 'New users · last 15 days';

    protected static ?int $sort = 3;

    protected ?string $maxHeight = '240px';

    protected string $color = 'primary';

    protected int | string | array $columnSpan = [
        'default' => 'full',
        'md' => 'full',
        'xl' => 2,
    ];

    protected function getType(): string
    {
        return 'line';
    }

    /**
     * @return array<string, mixed>
     */
    protected function getData(): array
    {
        $users = DashboardMetrics::dailySeries(User::query(), days: 15);
        $likes = DashboardMetrics::dailySeries(Like::query(), days: 15);

        return [
            'datasets' => [
                [
                    'label' => 'New users',
                    'data' => $users['values'],
                    'borderColor' => '#c5e000',
                    'backgroundColor' => 'rgba(223, 252, 1, 0.28)',
                    'fill' => 'origin',
                    'tension' => 0.4,
                    'pointRadius' => 3,
                    'pointHoverRadius' => 5,
                    'pointBackgroundColor' => '#0a0a0a',
                    'borderWidth' => 3,
                ],
                [
                    'label' => 'Likes',
                    'data' => $likes['values'],
                    'borderColor' => '#0a0a0a',
                    'backgroundColor' => 'rgba(10, 10, 10, 0.05)',
                    'fill' => false,
                    'tension' => 0.4,
                    'pointRadius' => 2,
                    'borderWidth' => 2,
                    'borderDash' => [5, 4],
                ],
            ],
            'labels' => $users['labels'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function getOptions(): array
    {
        return [
            'plugins' => [
                'legend' => [
                    'display' => true,
                    'labels' => [
                        'usePointStyle' => true,
                        'boxWidth' => 8,
                    ],
                ],
            ],
            'scales' => [
                'y' => [
                    'beginAtZero' => true,
                    'ticks' => [
                        'precision' => 0,
                    ],
                    'grid' => [
                        'color' => 'rgba(40, 40, 60, 0.06)',
                    ],
                ],
                'x' => [
                    'grid' => [
                        'display' => false,
                    ],
                ],
            ],
            'maintainAspectRatio' => false,
        ];
    }
}
