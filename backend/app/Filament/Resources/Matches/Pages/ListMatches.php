<?php

namespace App\Filament\Resources\Matches\Pages;

use App\Filament\Resources\Matches\MatchResource;
use Filament\Resources\Pages\ListRecords;

class ListMatches extends ListRecords
{
    protected static string $resource = MatchResource::class;

    protected ?string $heading = 'Matches';

    protected ?string $subheading = 'Successful connections across Cupid ET.';
}
