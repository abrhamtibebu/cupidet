<?php

namespace App\Filament\Resources\Reports;

use App\Filament\Resources\Reports\Pages\EditReport;
use App\Filament\Resources\Reports\Pages\ListReports;
use App\Models\Report;
use App\Models\User;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class ReportResource extends Resource
{
    protected static ?string $model = Report::class;

    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-chat-bubble-left-right';

    protected static ?string $navigationLabel = 'Contact';

    protected static ?string $pluralModelLabel = 'Contact';

    protected static ?int $navigationSort = 7;


    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Select::make('status')
                ->options([
                    'open' => 'Open',
                    'reviewing' => 'Reviewing',
                    'resolved' => 'Resolved',
                    'dismissed' => 'Dismissed',
                ])
                ->required(),
            Textarea::make('notes')->rows(4),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('id')->sortable(),
                TextColumn::make('reporter.username')->label('Reporter'),
                TextColumn::make('reportedUser.username')->label('Reported'),
                TextColumn::make('reason')->badge(),
                TextColumn::make('status')->badge(),
                TextColumn::make('created_at')->dateTime()->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                SelectFilter::make('status')->options([
                    'open' => 'Open',
                    'reviewing' => 'Reviewing',
                    'resolved' => 'Resolved',
                    'dismissed' => 'Dismissed',
                ]),
            ])
            ->recordActions([
                EditAction::make(),
                Action::make('suspendUser')
                    ->label('Suspend user')
                    ->color('warning')
                    ->requiresConfirmation()
                    ->action(function (Report $record) {
                        User::query()->whereKey($record->reported_user_id)->update(['status' => 'suspended']);
                        $record->update(['status' => 'resolved', 'notes' => trim(($record->notes ?? '')."\nSuspended by admin.")]);
                    }),
                Action::make('banUser')
                    ->label('Ban user')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->action(function (Report $record) {
                        User::query()->whereKey($record->reported_user_id)->update(['status' => 'banned']);
                        $record->update(['status' => 'resolved', 'notes' => trim(($record->notes ?? '')."\nBanned by admin.")]);
                    }),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListReports::route('/'),
            'edit' => EditReport::route('/{record}/edit'),
        ];
    }
}
