<x-filament-panels::page>
    <div class="cupid-page-grid">
        <div class="cupid-soft-card">
            <h3 class="cupid-soft-card__title">Languages</h3>
            <p class="cupid-soft-card__subtitle">Profile language selections</p>
            @forelse ($this->getLanguages() as $language)
                <div class="cupid-loc-row">
                    <span class="cupid-loc-name">{{ $language['name'] }}</span>
                    <span class="cupid-loc-count">{{ number_format($language['count']) }}</span>
                </div>
            @empty
                <p class="cupid-soft-card__subtitle" style="margin: 0;">No language data yet.</p>
            @endforelse
        </div>

        <div class="cupid-soft-card">
            <h3 class="cupid-soft-card__title">Top interests</h3>
            <p class="cupid-soft-card__subtitle">Most selected interests</p>
            @forelse ($this->getInterests() as $interest)
                <div class="cupid-loc-row">
                    <span class="cupid-loc-name">{{ $interest['name'] }}</span>
                    <span class="cupid-loc-count">{{ number_format($interest['count']) }}</span>
                </div>
            @empty
                <p class="cupid-soft-card__subtitle" style="margin: 0;">No interest data yet.</p>
            @endforelse
        </div>
    </div>
</x-filament-panels::page>
