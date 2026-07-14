<x-filament-panels::page>
    <div class="cupid-soft-card">
        <h3 class="cupid-soft-card__title">Locations</h3>
        <p class="cupid-soft-card__subtitle">Users by city across Ethiopia</p>

        <div style="display: grid; gap: 0.35rem;">
            @forelse ($this->getLocations() as $location)
                <div class="cupid-loc-row">
                    <div class="cupid-loc-row__left">
                        <span class="cupid-loc-dot" style="background: {{ $location['color'] }}"></span>
                        <span class="cupid-loc-name">{{ $location['name'] }}</span>
                    </div>
                    <div style="display: flex; align-items: baseline; gap: 0.65rem;">
                        <span style="font-size: 0.75rem; color: #6b6b6b;">{{ $location['percent'] }}%</span>
                        <span class="cupid-loc-count">{{ number_format($location['count']) }}</span>
                    </div>
                </div>
                <div style="height: 0.35rem; border-radius: 9999px; background: #ededed; overflow: hidden; margin-bottom: 0.35rem;">
                    <div style="height: 100%; width: {{ min(100, $location['percent']) }}%; background: {{ $location['color'] }};"></div>
                </div>
            @empty
                <p class="cupid-soft-card__subtitle" style="margin: 0;">No location data yet.</p>
            @endforelse
        </div>
    </div>
</x-filament-panels::page>
