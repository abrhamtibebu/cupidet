<?php

namespace App\Filament\Resources\Users;

use App\Filament\Resources\Users\Pages\EditUser;
use App\Filament\Resources\Users\Pages\ListUsers;
use App\Filament\Resources\Users\Pages\ViewUser;
use App\Models\User;
use BackedEnum;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Actions\ViewAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class UserResource extends Resource
{
    protected static ?string $model = User::class;

    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-users';

    protected static bool $shouldRegisterNavigation = false;

    protected static ?string $recordTitleAttribute = 'username';

    protected static ?int $navigationSort = 99;


    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Select::make('status')
                ->options([
                    'active' => 'Active',
                    'hidden' => 'Hidden',
                    'suspended' => 'Suspended',
                    'banned' => 'Banned',
                ])
                ->required(),
            Toggle::make('verified')->label('Verified badge'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('id')->sortable(),
                TextColumn::make('telegram_id')->searchable(),
                TextColumn::make('username')->searchable(),
                TextColumn::make('profile.name')->label('Name')->searchable(),
                TextColumn::make('status')->badge(),
                IconColumn::make('verified')->boolean(),
                TextColumn::make('last_active')->dateTime()->sortable(),
                TextColumn::make('created_at')->dateTime()->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')->options([
                    'active' => 'Active',
                    'hidden' => 'Hidden',
                    'suspended' => 'Suspended',
                    'banned' => 'Banned',
                ]),
            ])
            ->recordActions([
                ViewAction::make(),
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListUsers::route('/'),
            'view' => ViewUser::route('/{record}'),
            'edit' => EditUser::route('/{record}/edit'),
        ];
    }
}
