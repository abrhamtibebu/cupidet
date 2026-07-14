import { useEffect, useRef } from 'react'

type MapPoint = {
  lat: number
  lng: number
  name: string
  location: string
}

export function AdminUsersMap({
  points,
  emptyText = 'No mapped locations yet.',
}: {
  points: MapPoint[]
  emptyText?: string
}) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = mapRef.current
    if (!el || points.length === 0) return

    let map: import('leaflet').Map | null = null
    let cancelled = false

    ;(async () => {
      const L = await import('leaflet')
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !mapRef.current) return

      map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false }).setView([9.15, 38.7], 6)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 18,
      }).addTo(map)

      const icon = L.divIcon({
        className: 'admin-map-marker',
        html: '<span class="admin-map-marker-dot"></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      })

      const bounds: [number, number][] = []
      points.forEach((p) => {
        L.marker([p.lat, p.lng], { icon })
          .addTo(map!)
          .bindPopup(`<strong>${p.name}</strong><br>${p.location}`)
        bounds.push([p.lat, p.lng])
      })
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 7 })
      setTimeout(() => map?.invalidateSize(), 200)
    })()

    return () => {
      cancelled = true
      map?.remove()
    }
  }, [points])

  if (points.length === 0) {
    return (
      <div className="admin-map-frame admin-map-empty">
        <p className="admin-muted">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="admin-map-frame">
      <div ref={mapRef} className="admin-map" />
    </div>
  )
}
