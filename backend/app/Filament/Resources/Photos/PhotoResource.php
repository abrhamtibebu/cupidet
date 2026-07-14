<?php

namespace App\Filament\Resources\Photos;

use App\Filament\Resources\Photos\Pages\ListPhotos;
use App\Models\Photo;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Resources\Resource;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class PhotoResource extends Resource
{
    protected static ?string $model = Photo::class;

    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-check-badge';

    protected static ?string $navigationLabel = 'Approvals';

    protected static ?string $pluralModelLabel = 'Approvals';

    protected static ?int $navigationSort = 5;


    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                ImageColumn::make('image_url')->label('Photo')->height(64),
                TextColumn::make('user.username')->label('User')->searchable(),
                TextColumn::make('user.profile.name')->label('Name'),
                IconColumn::make('is_primary')->boolean(),
                TextColumn::make('status')->badge(),
                TextColumn::make('created_at')->dateTime()->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                SelectFilter::make('status')->options([
                    'pending' => 'Pending',
                    'approved' => 'Approved',
                    'rejected' => 'Rejected',
                ]),
            ])
            ->recordActions([
                Action::make('approve')
                    ->color('success')
                    ->visible(fn (Photo $record) => $record->status !== 'approved')
                    ->action(fn (Photo $record) => $record->update(['status' => 'approved'])),
                Action::make('reject')
                    ->color('danger')
                    ->visible(fn (Photo $record) => $record->status !== 'rejected')
                    ->action(fn (Photo $record) => $record->update(['status' => 'rejected'])),
                DeleteAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListPhotos::route('/'),
        ];
    }
}
