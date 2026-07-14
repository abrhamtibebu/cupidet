import { useEffect, useState } from 'react'
import { adminApi } from '../../lib/adminApi'

export function AdminNewOnlinePage() {
  const [bucket, setBucket] = useState('')
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    adminApi
      .users({ bucket: bucket || undefined })
      .then((res) => {
        if (alive) setRows(res.data)
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : 'Failed to load')
      })
    return () => {
      alive = false
    }
  }, [bucket])

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1>New & Online</h1>
          <p className="admin-muted">Recently joined and currently active people.</p>
        </div>
        <select value={bucket} onChange={(e) => setBucket(e.target.value)} className="admin-select">
          <option value="">All</option>
          <option value="online">Online (24h)</option>
          <option value="new">New (14d)</option>
        </select>
      </header>
      {error ? <p className="admin-error">{error}</p> : null}
      <div className="admin-card admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Name</th>
              <th>Location</th>
              <th>Verified</th>
              <th>Last active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.id)}>
                <td>{String(row.id)}</td>
                <td>{String(row.username ?? '—')}</td>
                <td>{String(row.name ?? '—')}</td>
                <td>{String(row.location ?? '—')}</td>
                <td>{row.verified ? 'Yes' : 'No'}</td>
                <td>{row.last_active ? new Date(String(row.last_active)).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
