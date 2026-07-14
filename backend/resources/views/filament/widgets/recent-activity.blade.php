<div class="cupid-soft-card">
    <h3 class="cupid-soft-card__title">Activity</h3>
    <p class="cupid-soft-card__subtitle">Latest likes, matches, and reports</p>

    @forelse ($this->getActivities() as $activity)
        <div class="cupid-activity-row">
            @if ($activity['photo'])
                <img
                    src="{{ $activity['photo'] }}"
                    alt="{{ $activity['name'] }}"
                    class="cupid-activity-avatar"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                />
            @else
                <div class="cupid-activity-avatar cupid-activity-avatar--fallback">
                    {{ $activity['initials'] }}
                </div>
            @endif

            <div class="cupid-activity-body">
                <p class="cupid-activity-text">
                    <strong>{{ $activity['name'] }}</strong> {{ $activity['text'] }}
                </p>
                <p class="cupid-activity-meta">{{ $activity['time'] }}</p>
            </div>

            <span class="cupid-activity-badge" aria-hidden="true"></span>
        </div>
    @empty
        <p class="cupid-soft-card__subtitle" style="margin: 0;">No recent activity yet.</p>
    @endforelse
</div>
