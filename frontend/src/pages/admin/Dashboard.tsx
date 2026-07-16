import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../../lib/adminApi'
import { AdminUsersMap } from './AdminUsersMap'
import { EmptyState, LoadingState, PageHeader, StatCard, StatusBadge } from './components/ui'

export function AdminDashboardPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminApi.stats>> | null>(null)
  const [locations, setLocations] = useState<Awaited<ReturnType<typeof adminApi.locations>> | null>(null)
  const [activity, setActivity] = useState<
    { type?: string; name: string; text: string; time: string; photo?: string | null }[]
  >([])
  const [messages, setMessages] = useState<{ name: string; preview: string; time: string; photo?: string | null }[]>(
    [],
  )
  const [points, setPoints] = useState<{ lat: number; lng: number; name: string; location: string }[]>([])
  const [mapMeta, setMapMeta] = useState({ total: 0, shown: 0 })
  const [reports, setReports] = useState<Awaited<ReturnType<typeof adminApi.reports>>['data']>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [s, locs, act, msgs, map, openReports] = await Promise.all([
          adminApi.stats(),
          adminApi.locations(),
          adminApi.activity(),
          adminApi.messages(),
          adminApi.map(),
          adminApi.reports({ status: 'open', per_page: 6 }),
        ])
        if (!alive) return
        setStats(s)
        setLocations(locs)
        setActivity(act.activity)
        setMessages(msgs.messages)
        setPoints(map.points)
        setMapMeta(map.meta)
        setReports(openReports.data)
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const chart = useMemo(() => {
    if (!stats) return null
    const { labels, values } = stats.series.users
    const max = Math.max(...values, 1)
    const w = 100
    const h = 40
    const path = values
      .map((v, i) => {
        const x = (i / Math.max(labels.length - 1, 1)) * w
        const y = h - (v / max) * (h - 4) - 2
        return `${i === 0 ? 'M' : 'L'}${x} ${y}`
      })
      .join(' ')
    return { labels, path, values }
  }, [stats])

  if (error) {
    return (
      <div className="admin-page">
        <PageHeader title="Dashboard" subtitle="Ops overview for Mingle 251." />
        <p className="admin-error">{error}</p>
      </div>
    )
  }

  if (loading || !stats) {
    return (
      <div className="admin-page">
        <PageHeader title="Dashboard" subtitle="Ops overview for Mingle 251." />
        <LoadingState rows={6} />
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      <PageHeader title="Dashboard" subtitle="Live counts, queues, and community activity." />

      <section className="admin-grid admin-grid-kpi">
        <StatCard
          label="Active users"
          value={stats.active_users}
          hint={`${stats.total_users.toLocaleString()} total · ${stats.verified_users} verified`}
          spark={stats.series.spark_users}
        />
        <StatCard
          label="Active (7d)"
          value={stats.active_7d}
          hint={`${stats.new_7d} new this week`}
          spark={stats.series.spark_active}
          sparkColor="#22c55e"
        />
        <StatCard
          label="Matches"
          value={stats.matches}
          hint={`${stats.likes.toLocaleString()} likes all-time`}
          spark={stats.series.spark_matches}
          sparkColor="#f59e0b"
        />
        <StatCard label="New today" value={stats.new_users_today} hint="Signups since midnight" />
      </section>

      <section className="admin-grid admin-grid-mid">
        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h3>Signups</h3>
              <p className="admin-muted">New users · last 15 days</p>
            </div>
          </div>
          {chart ? (
            <svg className="admin-chart" viewBox="0 0 100 40" preserveAspectRatio="none">
              <path d={chart.path} fill="none" stroke="#c5e000" strokeWidth="1.8" />
            </svg>
          ) : null}
        </article>

        <article className="admin-card">
          <h3>Moderation queues</h3>
          <p className="admin-muted">Items waiting for review</p>
          {[
            {
              label: 'Pending verifications',
              value: stats.pending_verifications,
              to: '/admin/approvals',
              cta: 'Compare',
            },
            { label: 'Pending photos', value: stats.pending_photos, to: '/admin/approvals', cta: 'Review' },
            { label: 'Open reports', value: stats.open_reports, to: '/admin/reports', cta: 'Moderate' },
          ].map((item) => (
            <div key={item.label} className="admin-queue-row">
              <div>
                <p className="admin-muted">{item.label}</p>
                <strong>{item.value}</strong>
              </div>
              <Link to={item.to} className="admin-btn-lime">
                {item.cta}
              </Link>
            </div>
          ))}
        </article>
      </section>

      <section className="admin-grid admin-grid-mid">
        <article className="admin-card admin-map-card">
          <div className="admin-card-head">
            <div>
              <h3>Users map</h3>
              <p className="admin-muted">Profiles with coordinates</p>
            </div>
            <span className="admin-pill">
              {mapMeta.shown} of {mapMeta.total} pins
            </span>
          </div>
          <AdminUsersMap points={points} />
        </article>

        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h3>Top locations</h3>
              <p className="admin-muted">Where people say they are</p>
            </div>
            <Link to="/admin/demographics" className="admin-link">
              Details
            </Link>
          </div>
          {(locations?.locations || []).slice(0, 6).map((loc) => (
            <div key={loc.name} className="admin-loc">
              <div>
                <span className="admin-dot" style={{ background: loc.color || '#dffc01' }} />
                <span>{loc.name}</span>
              </div>
              <strong>{loc.count}</strong>
            </div>
          ))}
          {(locations?.locations || []).length === 0 ? (
            <EmptyState title="No location data" subtitle="Profiles need a location set." />
          ) : null}
        </article>
      </section>

      <section className="admin-grid admin-grid-3">
        <article className="admin-card">
          <h3>Activity</h3>
          <p className="admin-muted">Likes, matches, reports, verifications</p>
          {activity.length === 0 ? <EmptyState title="No recent activity" /> : null}
          {activity.map((item, idx) => (
            <div key={`${item.name}-${idx}`} className="admin-feed-row">
              {item.photo ? (
                <img src={item.photo} alt="" referrerPolicy="no-referrer" />
              ) : (
                <div className="admin-feed-fallback">{item.name.slice(0, 2).toUpperCase()}</div>
              )}
              <div>
                <p>
                  <strong>{item.name}</strong> {item.text}
                </p>
                <span className="admin-muted">{item.time}</span>
              </div>
            </div>
          ))}
        </article>

        <article className="admin-card">
          <h3>Recent messages</h3>
          <p className="admin-muted">Latest chat across matches</p>
          {messages.length === 0 ? <EmptyState title="No messages yet" /> : null}
          {messages.map((item, idx) => (
            <div key={`${item.name}-${idx}`} className="admin-feed-row">
              {item.photo ? (
                <img src={item.photo} alt="" referrerPolicy="no-referrer" />
              ) : (
                <div className="admin-feed-fallback">{item.name.slice(0, 2).toUpperCase()}</div>
              )}
              <div className="admin-feed-body">
                <p>
                  <strong>{item.name}</strong>
                </p>
                <span className="admin-muted">{item.preview}</span>
                <span className="admin-muted">{item.time}</span>
              </div>
            </div>
          ))}
        </article>

        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h3>Open reports</h3>
              <p className="admin-muted">Needs moderation</p>
            </div>
            <Link to="/admin/reports" className="admin-link">
              View all
            </Link>
          </div>
          {reports.length === 0 ? (
            <EmptyState title="All clear" subtitle="No open reports right now." />
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table" style={{ minWidth: '18rem' }}>
                <thead>
                  <tr>
                    <th>Reported</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((row) => (
                    <tr key={row.id}>
                      <td>{row.reported ?? '—'}</td>
                      <td>{row.reason}</td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </div>
  )
}
