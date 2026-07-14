<div class="cupid-soft-card cupid-map-card">
    <div class="cupid-map-card__header">
        <div>
            <h3 class="cupid-soft-card__title">Users map</h3>
            <p class="cupid-soft-card__subtitle" style="margin-bottom: 0;">Active profiles across Ethiopia</p>
        </div>
        <span class="cupid-map-card__count">{{ number_format($this->getPoints()->count()) }} pins</span>
    </div>

    <div wire:ignore class="cupid-map-frame">
        <div
            id="cupid-users-map"
            class="cupid-users-map"
            data-points='@json($this->getPoints())'
        ></div>
    </div>
</div>

@assets
    <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossorigin=""
    />
    <script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
        crossorigin=""
    ></script>
@endassets

@script
<script>
    const mountCupidMap = () => {
        const el = document.getElementById('cupid-users-map')
        if (!el || el.dataset.ready === '1' || typeof window.L === 'undefined') {
            return false
        }

        let points = []
        try {
            points = JSON.parse(el.dataset.points || '[]')
        } catch (e) {
            points = []
        }

        const map = window.L.map(el, {
            zoomControl: true,
            scrollWheelZoom: false,
        }).setView([9.15, 38.7], 6)

        window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            maxZoom: 18,
        }).addTo(map)

        const icon = window.L.divIcon({
            className: 'cupid-map-marker',
            html: '<span class="cupid-map-marker__dot"></span>',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
        })

        const bounds = []
        points.forEach((point) => {
            window.L.marker([point.lat, point.lng], { icon })
                .addTo(map)
                .bindPopup(`<strong>${point.name}</strong><br>${point.location}`)
            bounds.push([point.lat, point.lng])
        })

        if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [28, 28], maxZoom: 7 })
        } else if (bounds.length === 1) {
            map.setView(bounds[0], 8)
        }

        el.dataset.ready = '1'
        setTimeout(() => map.invalidateSize(), 250)
        return true
    }

    const tryMount = () => {
        if (mountCupidMap()) return
        setTimeout(tryMount, 60)
    }

    tryMount()
</script>
@endscript
