<div class="cupid-soft-card">
    <h3 class="cupid-soft-card__title">Approvals</h3>
    <p class="cupid-soft-card__subtitle">Moderation queues at a glance</p>

    <div class="cupid-approvals">
        @foreach ($this->getItems() as $item)
            <div class="cupid-approval-item">
                <div>
                    <div class="cupid-approval-item__label">{{ $item['label'] }}</div>
                    <div class="cupid-approval-item__value">{{ number_format($item['value']) }}</div>
                </div>
                <a href="{{ $item['href'] }}" class="cupid-approval-item__link">{{ $item['cta'] }}</a>
            </div>
        @endforeach
    </div>
</div>
