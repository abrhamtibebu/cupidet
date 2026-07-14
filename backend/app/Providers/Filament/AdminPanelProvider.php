<?php

namespace App\Providers\Filament;

use App\Filament\Pages\Dashboard;
use App\Filament\Widgets\ActivityChart;
use App\Filament\Widgets\ApprovalsOverview;
use App\Filament\Widgets\ChatRequestsWidget;
use App\Filament\Widgets\LatestReportsWidget;
use App\Filament\Widgets\LocationsOverview;
use App\Filament\Widgets\RecentActivityWidget;
use App\Filament\Widgets\SidePromoStack;
use App\Filament\Widgets\StatsOverview;
use App\Filament\Widgets\UsersMapWidget;
use Filament\Enums\ThemeMode;
use Filament\FontProviders\BunnyFontProvider;
use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\AuthenticateSession;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Filament\Support\Enums\Width;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\HtmlString;
use Illuminate\View\Middleware\ShareErrorsFromSession;

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->default()
            ->id('admin')
            ->path('admin')
            ->login()
            ->authGuard('admin')
            ->authPasswordBroker('admins')
            ->brandName('Cupid ET')
            ->brandLogo(new HtmlString(
                <<<'HTML'
                <span class="cupid-brand-mark" title="Cupid ET Admin">
                    <span class="cupid-brand-mark__dot" aria-hidden="true">C</span>
                    <span class="cupid-brand-mark__text">
                        <span class="cupid-brand-mark__name">Cupid ET</span>
                        <span class="cupid-brand-mark__sub">Admin</span>
                    </span>
                </span>
                HTML
            ))
            ->brandLogoHeight('2rem')
            ->favicon(asset('favicon.ico'))
            ->font('DM Sans', provider: BunnyFontProvider::class)
            ->colors([
                'primary' => Color::hex('#111111'),
                'gray' => Color::Zinc,
                'danger' => Color::Rose,
                'warning' => Color::Amber,
                'success' => Color::Emerald,
                'info' => Color::Sky,
            ])
            ->viteTheme('resources/css/filament/admin/theme.css')
            ->defaultThemeMode(ThemeMode::Light)
            ->darkMode(false)
            ->sidebarCollapsibleOnDesktop()
            ->sidebarFullyCollapsibleOnDesktop()
            ->sidebarWidth('15rem')
            ->collapsedSidebarWidth('4.5rem')
            ->maxContentWidth(Width::SevenExtraLarge)
            ->globalSearch(true)
            ->userMenu(true)
            ->discoverResources(in: app_path('Filament/Resources'), for: 'App\\Filament\\Resources')
            ->discoverPages(in: app_path('Filament/Pages'), for: 'App\\Filament\\Pages')
            ->pages([
                Dashboard::class,
            ])
            ->discoverWidgets(in: app_path('Filament/Widgets'), for: 'App\\Filament\\Widgets')
            ->widgets([
                StatsOverview::class,
                SidePromoStack::class,
                UsersMapWidget::class,
                ApprovalsOverview::class,
                ActivityChart::class,
                LocationsOverview::class,
                RecentActivityWidget::class,
                ChatRequestsWidget::class,
                LatestReportsWidget::class,
            ])
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                VerifyCsrfToken::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
            ])
            ->authMiddleware([
                Authenticate::class,
            ]);
    }
}
