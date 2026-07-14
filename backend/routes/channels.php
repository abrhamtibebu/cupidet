<?php

use App\Models\MatchModel;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('match.{matchId}', function ($user, int $matchId) {
    $match = MatchModel::query()->find($matchId);

    return $match && $match->involves($user->id);
});
