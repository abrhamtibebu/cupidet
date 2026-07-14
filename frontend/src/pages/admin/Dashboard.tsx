import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../../lib/adminApi'
import { AdminUsersMap } from './AdminUsersMap'

function Spark({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1)
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * 100
      const y = 100 - (v / max) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg className="admin-spark" viewBox="0 0 100 40" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="2.5" points={points} />
    </svg>
  )
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminApi.stats>> | null>(null)
  const [locations, setLocations] = useState<{ name: string; count: number; color: string; percent: number }[]>([])
  const [activity, setActivity] = useState<{ name: string; text: string; time: string; photo?: string | null }[]>([])
  const [messages, setMessages] = useState<{ name: string; preview: string; time: string; photo?: string | null }[]>([])
  const [points, setPoints] = useState<{ lat: number; lng: number; name: string; location: string }[]>([])
  const [reports, setReports] = useState<Record<string, unknown>[]>([])
  const [error, setError] = useState('')

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
          adminApi.reports('open'),
        ])
        if (!alive) return
        setStats(s)
        setLocations(locs.locations)
        setActivity(act.activity)
        setMessages(msgs.messages)
        setPoints(map.points)
        setReports(openReports.data)
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Failed to load dashboard')
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

  if (error) return <p className="admin-error">{error}</p>
  if (!stats) return <p className="admin-muted">Loading dashboard…</p>

  return (
    <div className="admin-dashboard">
      <section className="admin-grid admin-grid-top">
        <div className="admin-stack">
          {[
            { eyebrow: 'Growth', title: 'Review new joiners and keep discovery fresh.', cta: 'New & Online', to: '/admin/new-online' },
            { eyebrow: 'Safety', title: 'Clear photo approvals so profiles stay live.', cta: 'Open Approvals', to: '/admin/approvals' },
            { eyebrow: 'Community', title: 'Browse matches and conversation health.', cta: 'View Matches', to: '/admin/matches' },
          ].map((card) => (
            <article key={card.to} className="admin-card admin-promo">
              <p className="admin-eyebrow">{card.eyebrow}</p>
              <h3>{card.title}</h3>
              <Link to={card.to} className="admin-btn-dark">
                {card.cta}
              </Link>
            </article>
          ))}
        </div>

        <div className="admin-stats">
          <article className="admin-card admin-stat">
            <p className="admin-muted">Total users</p>
            <strong>{stats.total_users.toLocaleString()}</strong>
            <span className="admin-muted">{stats.verified_users} verified</span>
            <Spark values={stats.series.spark_users} color="#c5e000" />
          </article>
          <article className="admin-card admin-stat">
            <p className="admin-muted">Active (7d)</p>
            <strong>{stats.active_7d.toLocaleString()}</strong>
            <span className="admin-ok">Recently online</span>
            <Spark values={stats.series.spark_active} color="#22c55e" />
          </article>
          <article className="admin-card admin-stat">
            <p className="admin-muted">Matches</p>
            <strong>{stats.matches.toLocaleString()}</strong>
            <span className="admin-warn">{stats.likes.toLocaleString()} likes all-time</span>
            <Spark values={stats.series.spark_matches} color="#f59e0b" />
          </article>
        </div>
      </section>

      <section className="admin-grid admin-grid-mid">
        <article className="admin-card admin-map-card">
          <div className="admin-card-head">
            <div>
              <h3>Users map</h3>
              <p className="admin-muted">Active profiles across Ethiopia</p>
            </div>
            <span className="admin-pill">{points.length} pins</span>
          </div>
          <AdminUsersMap points={points} />
        </article>

        <article className="admin-card">
          <h3>Approvals</h3>
          <p className="admin-muted">Moderation queues at a glance</p>
          {[
            { label: 'Pending photos', value: stats.pending_photos, to: '/admin/approvals', cta: 'Review' },
            { label: 'Open reports', value: stats.open_reports, to: '/admin/contact', cta: 'Moderate' },
            { label: 'New users today', value: stats.new_users_today, to: '/admin/new-online', cta: 'View' },
          ].map((item) => (
            <div key={item.label} className="admin-approval">
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

      {chart ? (
        <article className="admin-card">
          <h3>Signups</h3>
          <p className="admin-muted">New users · last 15 days</p>
          <svg className="admin-chart" viewBox="0 0 100 40" preserveAspectRatio="none">
            <path d={`${chart.path}`} fill="none" stroke="#c5e000" strokeWidth="1.8" />
          </svg>
        </article>
      ) : null}

      <section className="admin-grid admin-grid-3">
        <article className="admin-card">
          <h3>Demographics</h3>
          <p className="admin-muted">Top locations across Habesha users</p>
          {locations.map((loc) => (
            <div key={loc.name} className="admin-loc">
              <div>
                <span className="admin-dot" style={{ background: loc.color }} />
                <span>{loc.name}</span>
              </div>
              <strong>{loc.count}</strong>
            </div>
          ))}
        </article>

        <article className="admin-card">
          <h3>Activity</h3>
          <p className="admin-muted">Latest likes, matches, and reports</p>
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
          <h3>Chat requests</h3>
          <p className="admin-muted">Latest messages across matches</p>
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
      </section>

      <article className="admin-card">
        <div className="admin-card-head">
          <div>
            <h3>Open reports</h3>
            <p className="admin-muted">Items waiting for moderation</p>
          </div>
          <Link to="/admin/contact" className="admin-link">
            View all
          </Link>
        </div>
        {reports.length === 0 ? (
          <div className="admin-empty">
            <p>All clear</p>
            <span className="admin-muted">No open reports right now.</span>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Reporter</th>
                  <th>Reported</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reports.slice(0, 6).map((row) => (
                  <tr key={String(row.id)}>
                    <td>{String(row.id)}</td>
                    <td>{String(row.reporter ?? '—')}</td>
                    <td>{String(row.reported ?? '—')}</td>
                    <td>{String(row.reason ?? '—')}</td>
                    <td>{String(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </div>
  )
}
