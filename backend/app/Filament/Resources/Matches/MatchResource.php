<?php

namespace App\Filament\Resources\Matches;

use App\Filament\Resources\Matches\Pages\ListMatches;
use App\Models\MatchModel;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class MatchResource extends Resource
{
    protected static ?string $model = MatchModel::class;

    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-heart';

    protected static ?string $navigationLabel = 'Matches';

    protected static ?string $modelLabel = 'Match';

    protected static ?string $pluralModelLabel = 'Matches';

    protected static ?string $slug = 'matches';

    protected static ?int $navigationSort = 2;

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('id')->label('#')->sortable(),
                TextColumn::make('userOne.profile.name')
                    ->label('User one')
                    ->placeholder(fn (MatchModel $record): string => $record->userOne?->username ?? '—')
                    ->searchable(),
                TextColumn::make('userTwo.profile.name')
                    ->label('User two')
                    ->placeholder(fn (MatchModel $record): string => $record->userTwo?->username ?? '—')
                    ->searchable(),
                TextColumn::make('messages_count')
                    ->counts('messages')
                    ->label('Messages'),
                TextColumn::make('matched_at')
                    ->label('Matched')
                    ->dateTime()
                    ->sortable(),
            ])
            ->defaultSort('matched_at', 'desc')
            ->paginated([10, 25, 50]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListMatches::route('/'),
        ];
    }
}
