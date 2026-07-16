import { useEffect, useState } from 'react'
import { adminApi, type AdminMatchRow } from '../../lib/adminApi'
import { EmptyState, LoadingState, PageHeader, Pagination } from './components/ui'

export function AdminMatchesPage() {
  const [rows, setRows] = useState<AdminMatchRow[]>([])
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ total: 0, per_page: 50, current_page: 1, last_page: 1 })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    adminApi
      .matches({ page })
      .then((res) => {
        if (!alive) return
        setRows(res.data)
        setMeta(res.meta)
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : 'Failed to load')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [page])

  return (
    <div className="admin-page">
      <PageHeader title="Matches" subtitle="Successful connections across Mingle 251." />
      {error ? <p className="admin-error">{error}</p> : null}
      <div className="admin-card admin-table-wrap">
        {loading ? <LoadingState /> : null}
        {!loading && rows.length === 0 ? <EmptyState title="No matches yet" /> : null}
        {!loading && rows.length > 0 ? (
          <>
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
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.user_one ?? '—'}</td>
                    <td>{row.user_two ?? '—'}</td>
                    <td>{row.messages_count}</td>
                    <td>{row.matched_at ? new Date(row.matched_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={meta.current_page} lastPage={meta.last_page} total={meta.total} onPage={setPage} />
          </>
        ) : null}
      </div>
    </div>
  )
}
