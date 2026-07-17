<?php

namespace App\Filament\Pages;

use App\Jobs\BroadcastTelegramGroupsJob;
use App\Models\TelegramGroup;
use App\Support\TelegramHtml;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Actions\Concerns\InteractsWithActions;
use Filament\Actions\Contracts\HasActions;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\RichEditor;
use Filament\Forms\Components\Toggle;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\EmbeddedTable;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Concerns\InteractsWithSchemas;
use Filament\Schemas\Contracts\HasSchemas;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Concerns\InteractsWithTable;
use Filament\Tables\Contracts\HasTable;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;
use Illuminate\Contracts\Support\Htmlable;
use Illuminate\Support\Facades\Storage;
use UnitEnum;

class BroadcastGroups extends Page implements HasActions, HasSchemas, HasTable
{
    use InteractsWithActions;
    use InteractsWithSchemas;
    use InteractsWithTable;

    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-megaphone';

    protected static ?string $navigationLabel = 'Broadcast';

    protected static string|UnitEnum|null $navigationGroup = 'Telegram';

    protected static ?string $slug = 'broadcast-groups';

    protected static ?string $title = 'Broadcast to groups';

    protected static ?int $navigationSort = 20;

    public function getHeading(): string | Htmlable
    {
        return 'Broadcast to groups';
    }

    public function getSubheading(): string | Htmlable | null
    {
        $active = TelegramGroup::query()->active()->count();

        return "Groups where the bot is a member. {$active} active. Re-add the bot to a group if it is missing from this list.";
    }

    public function content(Schema $schema): Schema
    {
        return $schema
            ->components([
                EmbeddedTable::make(),
            ]);
    }

    /**
     * @return array<int, mixed>
     */
    private function composerForm(): array
    {
        return [
            RichEditor::make('message')
                ->label('Message')
                ->placeholder('Write your announcement… Add emoji with Win + . (Windows) or Ctrl + Cmd + Space (Mac).')
                ->helperText('Supports bold, italic, underline, strike, links, and emoji. Optional image is sent as a Telegram photo with this text as the caption.')
                ->toolbarButtons([
                    ['bold', 'italic', 'underline', 'strike'],
                    ['link'],
                    ['bulletList', 'orderedList'],
                    ['blockquote', 'codeBlock'],
                    ['undo', 'redo'],
                ])
                ->columnSpanFull()
                ->required(fn (Get $get): bool => blank($get('image'))),
            FileUpload::make('image')
                ->label('Image')
                ->helperText('Optional. JPG, PNG, GIF, or WebP — sent as a photo above the caption.')
                ->image()
                ->imageEditor()
                ->disk('public')
                ->directory('broadcasts')
                ->visibility('public')
                ->maxSize(5120)
                ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
            Toggle::make('with_app_button')
                ->label('Attach “Open Mingle 251” button')
                ->default(true),
        ];
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('broadcast')
                ->label('Send broadcast')
                ->icon('heroicon-o-paper-airplane')
                ->color('primary')
                ->modalWidth('3xl')
                ->form($this->composerForm())
                ->requiresConfirmation()
                ->modalHeading('Broadcast to all active groups')
                ->modalDescription(fn (): string => 'Queues a message to '.TelegramGroup::query()->active()->count().' active group(s).')
                ->action(function (array $data): void {
                    $this->queueBroadcast($data);
                }),
        ];
    }

    public function table(Table $table): Table
    {
        return $table
            ->query(TelegramGroup::query()->latest('updated_at'))
            ->columns([
                TextColumn::make('title')
                    ->label('Group')
                    ->searchable()
                    ->placeholder('Untitled'),
                TextColumn::make('chat_id')
                    ->label('Chat ID')
                    ->copyable()
                    ->toggleable(),
                TextColumn::make('type')->badge(),
                TextColumn::make('username')
                    ->placeholder('—')
                    ->toggleable(),
                IconColumn::make('is_active')
                    ->label('Active')
                    ->boolean(),
                TextColumn::make('joined_at')
                    ->since()
                    ->placeholder('—'),
                TextColumn::make('left_at')
                    ->since()
                    ->placeholder('—')
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                TernaryFilter::make('is_active')->label('Active'),
            ])
            ->recordActions([
                Action::make('sendOne')
                    ->label('Send')
                    ->icon('heroicon-o-paper-airplane')
                    ->modalWidth('3xl')
                    ->form($this->composerForm())
                    ->action(function (TelegramGroup $record, array $data): void {
                        $this->queueBroadcast($data, [$record->chat_id]);
                    }),
                Action::make('deactivate')
                    ->label('Deactivate')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->visible(fn (TelegramGroup $record): bool => $record->is_active)
                    ->action(fn (TelegramGroup $record) => $record->update([
                        'is_active' => false,
                        'left_at' => now(),
                    ])),
                Action::make('activate')
                    ->label('Activate')
                    ->color('success')
                    ->visible(fn (TelegramGroup $record): bool => ! $record->is_active)
                    ->action(fn (TelegramGroup $record) => $record->update([
                        'is_active' => true,
                        'left_at' => null,
                    ])),
            ])
            ->defaultSort('updated_at', 'desc')
            ->paginated([10, 25, 50]);
    }

    /**
     * @param  array{message?: string, image?: string|array|null, with_app_button?: bool}  $data
     * @param  list<int>|null  $chatIds
     */
    private function queueBroadcast(array $data, ?array $chatIds = null): void
    {
        $text = TelegramHtml::fromRichHtml($data['message'] ?? null);
        $image = $data['image'] ?? null;
        if (is_array($image)) {
            $image = $image[0] ?? null;
        }
        $photoPath = is_string($image) && $image !== '' ? $image : null;

        if ($text === '' && $photoPath === null) {
            Notification::make()->title('Add a message or an image')->danger()->send();

            return;
        }

        if ($photoPath !== null && ! Storage::disk('public')->exists($photoPath)) {
            Notification::make()->title('Image upload failed')->danger()->send();

            return;
        }

        $count = $chatIds !== null
            ? count($chatIds)
            : TelegramGroup::query()->active()->count();

        if ($count === 0) {
            Notification::make()
                ->title('No groups to send to')
                ->body('Add the bot to a group (or re-add it) so we can record the chat id.')
                ->warning()
                ->send();

            return;
        }

        BroadcastTelegramGroupsJob::dispatch(
            $text,
            $chatIds,
            (bool) ($data['with_app_button'] ?? true),
            $photoPath,
        );

        Notification::make()
            ->title('Broadcast queued')
            ->body("Sending to {$count} group(s).")
            ->success()
            ->send();
    }
}
