<?php

namespace App\Jobs;

use App\Models\MatchModel;
use App\Services\TelegramNotifier;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendMatchNotificationJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $matchId) {}

    public function handle(TelegramNotifier $notifier): void
    {
        $match = MatchModel::query()
            ->with(['userOne.profile', 'userTwo.profile'])
            ->find($this->matchId);

        if (! $match) {
            return;
        }

        $one = $match->userOne;
        $two = $match->userTwo;
        if (! $one || ! $two) {
            return;
        }

        $notifier->notifyMatch($one, $two->displayName());
        $notifier->notifyMatch($two, $one->displayName());
    }
}
