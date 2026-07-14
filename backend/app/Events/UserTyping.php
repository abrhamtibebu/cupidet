<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserTyping implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $matchId,
        public int $userId,
        public bool $typing,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('match.'.$this->matchId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'user.typing';
    }

    public function broadcastWith(): array
    {
        return [
            'match_id' => $this->matchId,
            'user_id' => $this->userId,
            'typing' => $this->typing,
        ];
    }
}
