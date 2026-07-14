import { useEffect, useState } from 'react'
import { adminApi } from '../../lib/adminApi'

export function AdminMatchesPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi
      .matches()
      .then((res) => setRows(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [])

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1>Matches</h1>
          <p className="admin-muted">Successful connections across Cupid ET.</p>
        </div>
      </header>
      {error ? <p className="admin-error">{error}</p> : null}
      <div className="admin-card admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>User one</th>
              <th>User two</th>
              <th>Messages</th>
              <th>Matched</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.id)}>
                <td>{String(row.id)}</td>
                <td>{String(row.user_one ?? '—')}</td>
                <td>{String(row.user_two ?? '—')}</td>
                <td>{String(row.messages_count ?? 0)}</td>
                <td>{row.matched_at ? new Date(String(row.matched_at)).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
