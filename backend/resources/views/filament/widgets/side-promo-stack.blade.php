<div class="cupid-side-stack">
    @foreach ($this->getCards() as $card)
        <div class="cupid-promo-card">
            <p class="cupid-promo-card__eyebrow">{{ $card['eyebrow'] }}</p>
            <h3 class="cupid-promo-card__title">{{ $card['title'] }}</h3>
            <a href="{{ $card['href'] }}" class="cupid-promo-card__cta">{{ $card['cta'] }}</a>
        </div>
    @endforeach
</div>
