<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Message $message) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('match.'.$this->message->match_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    public function broadcastWith(): array
    {
        return [
            'message' => [
                'id' => $this->message->id,
                'match_id' => $this->message->match_id,
                'body' => $this->message->body,
                'type' => $this->message->type ?: 'text',
                'meta' => $this->message->meta,
                'sender_id' => $this->message->sender_id,
                'delivered_at' => $this->message->delivered_at,
                'read_at' => $this->message->read_at,
                'created_at' => $this->message->created_at,
            ],
        ];
    }
}
