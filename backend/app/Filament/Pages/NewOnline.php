<?php

namespace App\Filament\Pages;

use App\Filament\Resources\Users\UserResource;
use App\Models\User;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Actions\Concerns\InteractsWithActions;
use Filament\Actions\Contracts\HasActions;
use Filament\Pages\Page;
use Filament\Schemas\Components\EmbeddedTable;
use Filament\Schemas\Concerns\InteractsWithSchemas;
use Filament\Schemas\Contracts\HasSchemas;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Concerns\InteractsWithTable;
use Filament\Tables\Contracts\HasTable;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Contracts\Support\Htmlable;

class NewOnline extends Page implements HasActions, HasSchemas, HasTable
{
    use InteractsWithActions;
    use InteractsWithSchemas;
    use InteractsWithTable;

    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-signal';

    protected static ?string $navigationLabel = 'New & Online';

    protected static ?string $slug = 'new-online';

    protected static ?string $title = 'New & Online';

    protected static ?int $navigationSort = 3;

    public function getHeading(): string | Htmlable
    {
        return 'New & Online';
    }

    public function getSubheading(): string | Htmlable | null
    {
        return 'Recently joined and currently active people.';
    }

    public function content(Schema $schema): Schema
    {
        return $schema
            ->components([
                EmbeddedTable::make(),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->query(
                User::query()
                    ->with('profile')
                    ->where(function ($query): void {
                        $query
                            ->where('created_at', '>=', now()->subDays(14))
                            ->orWhere('last_active', '>=', now()->subDay());
                    })
                    ->latest('last_active')
            )
            ->columns([
                TextColumn::make('id')->sortable(),
                TextColumn::make('username')->searchable(),
                TextColumn::make('profile.name')->label('Name')->searchable(),
                TextColumn::make('profile.location')->label('Location')->toggleable(),
                IconColumn::make('verified')->boolean(),
                TextColumn::make('last_active')
                    ->label('Last active')
                    ->since()
                    ->sortable(),
                TextColumn::make('created_at')
                    ->label('Joined')
                    ->date()
                    ->sortable(),
            ])
            ->filters([
                SelectFilter::make('bucket')
                    ->label('Show')
                    ->options([
                        'online' => 'Online (24h)',
                        'new' => 'New (14d)',
                    ])
                    ->query(function ($query, array $data) {
                        return match ($data['value'] ?? null) {
                            'online' => $query->where('last_active', '>=', now()->subDay()),
                            'new' => $query->where('created_at', '>=', now()->subDays(14)),
                            default => $query,
                        };
                    }),
            ])
            ->recordActions([
                Action::make('view')
                    ->url(fn (User $record): string => UserResource::getUrl('view', ['record' => $record])),
            ])
            ->defaultSort('last_active', 'desc');
    }
}
