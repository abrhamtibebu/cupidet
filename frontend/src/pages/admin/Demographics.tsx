import { useEffect, useState } from 'react'
import { adminApi } from '../../lib/adminApi'
import { AdminUsersMap } from './AdminUsersMap'

export function AdminDemographicsPage() {
  const [locations, setLocations] = useState<{ name: string; count: number; color: string; percent: number }[]>([])
  const [points, setPoints] = useState<{ lat: number; lng: number; name: string; location: string }[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [locs, map] = await Promise.all([adminApi.locations(), adminApi.map()])
        if (!alive) return
        setLocations(locs.locations)
        setPoints(map.points)
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1>Demographics</h1>
          <p className="admin-muted">Where your Habesha community lives.</p>
        </div>
      </header>
      {error ? <p className="admin-error">{error}</p> : null}
      {loading ? <p className="admin-muted">Loading demographics…</p> : null}

      {!loading ? (
        <section className="admin-grid admin-grid-mid">
          <article className="admin-card admin-map-card">
            <div className="admin-card-head">
              <div>
                <h3>Users map</h3>
                <p className="admin-muted">Profile pins across Ethiopia</p>
              </div>
              <span className="admin-pill">{points.length} pins</span>
            </div>
            <div className="admin-map-tall">
              <AdminUsersMap points={points} />
            </div>
          </article>

          <article className="admin-card">
            <h3>Locations</h3>
            <p className="admin-muted">Top cities and regions</p>
            {locations.length === 0 ? <p className="admin-muted">No location data yet.</p> : null}
            {locations.map((loc) => (
              <div key={loc.name}>
                <div className="admin-loc">
                  <div>
                    <span className="admin-dot" style={{ background: loc.color }} />
                    <span>{loc.name}</span>
                  </div>
                  <div className="admin-loc-meta">
                    <span className="admin-muted">{loc.percent}%</span>
                    <strong>{loc.count}</strong>
                  </div>
                </div>
                <div className="admin-bar">
                  <span style={{ width: `${Math.min(100, loc.percent)}%`, background: loc.color }} />
                </div>
              </div>
            ))}
          </article>
        </section>
      ) : null}
    </div>
  )
}
