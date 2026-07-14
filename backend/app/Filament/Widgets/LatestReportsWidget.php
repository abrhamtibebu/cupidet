<?php

namespace App\Filament\Widgets;

use App\Filament\Resources\Reports\ReportResource;
use App\Models\Report;
use Filament\Actions\Action;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget;

class LatestReportsWidget extends TableWidget
{
    protected static ?string $heading = 'Open reports';

    protected static ?int $sort = 7;

    protected int | string | array $columnSpan = [
        'default' => 'full',
        'md' => 'full',
        'xl' => 1,
    ];

    public function table(Table $table): Table
    {
        return $table
            ->query(
                Report::query()
                    ->with(['reporter.profile', 'reportedUser.profile'])
                    ->whereIn('status', ['open', 'reviewing'])
                    ->latest()
            )
            ->heading('Open reports')
            ->description('Items waiting for a moderator decision.')
            ->columns([
                TextColumn::make('id')->label('#')->sortable(),
                TextColumn::make('reporter.username')
                    ->label('Reporter')
                    ->placeholder('—')
                    ->searchable(),
                TextColumn::make('reportedUser.username')
                    ->label('Reported')
                    ->placeholder('—')
                    ->searchable(),
                TextColumn::make('reason')
                    ->limit(36)
                    ->wrap()
                    ->placeholder('No reason'),
                TextColumn::make('status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'open' => 'warning',
                        'reviewing' => 'info',
                        default => 'gray',
                    }),
                TextColumn::make('created_at')
                    ->label('Opened')
                    ->since()
                    ->sortable(),
            ])
            ->recordActions([
                Action::make('review')
                    ->label('Review')
                    ->icon('heroicon-m-arrow-right')
                    ->url(fn (Report $record): string => ReportResource::getUrl('edit', ['record' => $record])),
            ])
            ->headerActions([
                Action::make('viewAll')
                    ->label('View all')
                    ->url(ReportResource::getUrl('index'))
                    ->color('gray'),
            ])
            ->paginated([5])
            ->defaultPaginationPageOption(5)
            ->emptyStateHeading('All clear')
            ->emptyStateDescription('No open or in-review reports right now.')
            ->emptyStateIcon('heroicon-o-check-badge');
    }
}
