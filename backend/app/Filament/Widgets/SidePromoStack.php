<?php

namespace App\Filament\Widgets;

use App\Filament\Pages\NewOnline;
use App\Filament\Resources\Matches\MatchResource;
use App\Filament\Resources\Photos\PhotoResource;
use Filament\Widgets\Widget;

class SidePromoStack extends Widget
{
    protected static ?int $sort = 1;

    protected string $view = 'filament.widgets.side-promo-stack';

    protected int | string | array $columnSpan = [
        'default' => 'full',
        'md' => 'full',
        'xl' => 1,
    ];

    /**
     * @return array{title: string, eyebrow: string, href: string, cta: string}[]
     */
    public function getCards(): array
    {
        return [
            [
                'eyebrow' => 'Growth',
                'title' => 'Review new joiners and keep discovery fresh.',
                'href' => NewOnline::getUrl(),
                'cta' => 'New & Online',
            ],
            [
                'eyebrow' => 'Safety',
                'title' => 'Clear photo approvals so profiles stay live.',
                'href' => PhotoResource::getUrl('index'),
                'cta' => 'Open Approvals',
            ],
            [
                'eyebrow' => 'Community',
                'title' => 'Browse matches and conversation health.',
                'href' => MatchResource::getUrl('index'),
                'cta' => 'View Matches',
            ],
        ];
    }
}
