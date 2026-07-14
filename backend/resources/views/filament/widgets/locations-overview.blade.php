<div class="cupid-soft-card">
    <h3 class="cupid-soft-card__title">Demographics</h3>
    <p class="cupid-soft-card__subtitle">Top locations across Habesha users</p>

    @forelse ($this->getLocations() as $location)
        <div class="cupid-loc-row">
            <div class="cupid-loc-row__left">
                <span class="cupid-loc-dot" style="background: {{ $location['color'] }}"></span>
                <span class="cupid-loc-name">{{ $location['name'] }}</span>
            </div>
            <span class="cupid-loc-count">{{ number_format($location['count']) }}</span>
        </div>
    @empty
        <p class="cupid-soft-card__subtitle" style="margin: 0;">No location data yet.</p>
    @endforelse
</div>
