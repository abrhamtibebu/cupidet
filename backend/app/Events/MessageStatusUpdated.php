<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  array<int, array{id:int,delivered_at:?string,read_at:?string}>  $messages
     */
    public function __construct(
        public int $matchId,
        public array $messages,
        public string $status,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('match.'.$this->matchId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.status';
    }

    public function broadcastWith(): array
    {
        return [
            'match_id' => $this->matchId,
            'status' => $this->status,
            'messages' => $this->messages,
        ];
    }
}
