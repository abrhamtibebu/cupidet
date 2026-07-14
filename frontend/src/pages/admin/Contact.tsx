import { useEffect, useState } from 'react'
import { adminApi } from '../../lib/adminApi'

export function AdminContactPage() {
  const [status, setStatus] = useState('open')
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [error, setError] = useState('')

  async function load() {
    const res = await adminApi.reports(status || undefined)
    setRows(res.data)
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [status])

  async function resolve(id: number) {
    await adminApi.updateReport(id, { status: 'resolved' })
    await load()
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1>Contact</h1>
          <p className="admin-muted">User reports and moderation notes.</p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="admin-select">
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="reviewing">Reviewing</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </header>
      {error ? <p className="admin-error">{error}</p> : null}
      <div className="admin-card admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Reporter</th>
              <th>Reported</th>
              <th>Reason</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.id)}>
                <td>{String(row.id)}</td>
                <td>{String(row.reporter ?? '—')}</td>
                <td>{String(row.reported ?? '—')}</td>
                <td>{String(row.reason ?? '—')}</td>
                <td>{String(row.status)}</td>
                <td>
                  {row.status === 'open' || row.status === 'reviewing' ? (
                    <button type="button" className="admin-btn-lime" onClick={() => resolve(Number(row.id))}>
                      Resolve
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
