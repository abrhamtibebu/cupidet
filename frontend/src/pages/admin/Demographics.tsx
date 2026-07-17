import { useEffect, useState } from 'react'
import { adminApi, type AdminBreakdown } from '../../lib/adminApi'
import { AdminUsersMap } from './AdminUsersMap'
import { EmptyState, LoadingState, PageHeader } from './components/ui'

function BreakdownList({ title, subtitle, rows }: { title: string; subtitle: string; rows: AdminBreakdown[] }) {
  return (
    <article className="admin-card">
      <h3>{title}</h3>
      <p className="admin-muted">{subtitle}</p>
      {rows.length === 0 ? <EmptyState title="No data yet" /> : null}
      {rows.map((row) => (
        <div key={row.name}>
          <div className="admin-loc">
            <div>
              <span className="admin-dot" style={{ background: row.color || '#fe3461' }} />
              <span>{row.name}</span>
            </div>
            <div className="admin-loc-meta">
              {typeof row.percent === 'number' ? <span className="admin-muted">{row.percent}%</span> : null}
              <strong>{row.count}</strong>
            </div>
          </div>
          {typeof row.percent === 'number' ? (
            <div className="admin-bar">
              <span style={{ width: `${Math.min(100, row.percent)}%`, background: row.color || '#fe3461' }} />
            </div>
          ) : null}
        </div>
      ))}
    </article>
  )
}

export function AdminDemographicsPage() {
  const [locations, setLocations] = useState<AdminBreakdown[]>([])
  const [genders, setGenders] = useState<AdminBreakdown[]>([])
  const [ages, setAges] = useState<AdminBreakdown[]>([])
  const [goals, setGoals] = useState<AdminBreakdown[]>([])
  const [points, setPoints] = useState<{ lat: number; lng: number; name: string; location: string }[]>([])
  const [mapMeta, setMapMeta] = useState({ total: 0, shown: 0 })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [locs, map] = await Promise.all([adminApi.locations(), adminApi.map()])
        if (!alive) return
        setLocations(locs.locations)
        setGenders(locs.genders)
        setAges(locs.age_bands)
        setGoals(locs.relationship_goals)
        setPoints(map.points)
        setMapMeta(map.meta)
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
      <PageHeader title="Demographics" subtitle="Where people are, who they are, and what they’re looking for." />
      {error ? <p className="admin-error">{error}</p> : null}
      {loading ? <LoadingState rows={6} /> : null}

      {!loading ? (
        <>
          <section className="admin-grid admin-grid-mid">
            <article className="admin-card admin-map-card">
              <div className="admin-card-head">
                <div>
                  <h3>Users map</h3>
                  <p className="admin-muted">Profile pins with coordinates</p>
                </div>
                <span className="admin-pill">
                  {mapMeta.shown} of {mapMeta.total} pins
                </span>
              </div>
              <div className="admin-map-tall">
                <AdminUsersMap points={points} />
              </div>
            </article>

            <BreakdownList title="Locations" subtitle="Top cities and regions" rows={locations} />
          </section>

          <section className="admin-grid admin-grid-3">
            <BreakdownList title="Gender" subtitle="Self-reported gender" rows={genders} />
            <BreakdownList title="Age bands" subtitle="From birth date" rows={ages} />
            <BreakdownList title="Relationship goals" subtitle="What people are looking for" rows={goals} />
          </section>
        </>
      ) : null}
    </div>
  )
}
