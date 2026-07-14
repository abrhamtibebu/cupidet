<div class="cupid-soft-card">
    <h3 class="cupid-soft-card__title">Chat requests</h3>
    <p class="cupid-soft-card__subtitle">Latest messages across matches</p>

    @forelse ($this->getMessages() as $message)
        <div class="cupid-chat-row">
            @if ($message['photo'])
                <img
                    src="{{ $message['photo'] }}"
                    alt="{{ $message['name'] }}"
                    class="cupid-chat-avatar"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                />
            @else
                <div class="cupid-chat-avatar cupid-chat-avatar--fallback">
                    {{ $message['initials'] }}
                </div>
            @endif

            <div class="cupid-chat-body">
                <p class="cupid-chat-text"><strong>{{ $message['name'] }}</strong></p>
                <p class="cupid-chat-meta">{{ $message['preview'] }}</p>
                <p class="cupid-chat-meta">{{ $message['time'] }}</p>
            </div>

            <span class="cupid-chat-reply">Reply</span>
        </div>
    @empty
        <p class="cupid-soft-card__subtitle" style="margin: 0;">No messages yet.</p>
    @endforelse
</div>
