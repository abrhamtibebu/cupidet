<?php

namespace App\Filament\Widgets;

use App\Filament\Resources\Photos\PhotoResource;
use App\Filament\Resources\Reports\ReportResource;
use App\Filament\Resources\Users\UserResource;
use App\Models\Photo;
use App\Models\Report;
use App\Models\User;
use Filament\Widgets\Widget;

class ApprovalsOverview extends Widget
{
    protected static ?int $sort = 2;

    protected string $view = 'filament.widgets.approvals-overview';

    protected int | string | array $columnSpan = [
        'default' => 'full',
        'md' => 'full',
        'xl' => 1,
    ];

    /**
     * @return array<int, array{label: string, value: int, href: string, cta: string}>
     */
    public function getItems(): array
    {
        return [
            [
                'label' => 'Pending photos',
                'value' => Photo::query()->where('status', 'pending')->count(),
                'href' => PhotoResource::getUrl('index'),
                'cta' => 'Review',
            ],
            [
                'label' => 'Open reports',
                'value' => Report::query()->where('status', 'open')->count(),
                'href' => ReportResource::getUrl('index'),
                'cta' => 'Moderate',
            ],
            [
                'label' => 'New users today',
                'value' => User::query()->whereDate('created_at', today())->count(),
                'href' => UserResource::getUrl('index'),
                'cta' => 'View',
            ],
        ];
    }
}
