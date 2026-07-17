import { useEffect, useState } from 'react'
import { adminApi, type AdminFeedbackRow } from '../../lib/adminApi'
import { EmptyState, LoadingState, PageHeader, Pagination, StatusBadge } from './components/ui'

const STATUSES = ['open', 'reviewing', 'planned', 'resolved', 'dismissed']
const CATEGORIES = ['general', 'bug', 'idea', 'confusing', 'success']

export function AdminFeedbackPage() {
  const [status, setStatus] = useState('open')
  const [category, setCategory] = useState('')
  const [rows, setRows] = useState<AdminFeedbackRow[]>([])
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ total: 0, per_page: 50, current_page: 1, last_page: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})

  async function load(nextPage = page) {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.feedback({
        status: status || undefined,
        category: category || undefined,
        page: nextPage,
      })
      setRows(res.data)
      setMeta(res.meta)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
  }, [status, category])

  useEffect(() => {
    void load(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, category, page])

  async function update(id: number, nextStatus: string) {
    setBusyId(id)
    setActionError('')
    try {
      await adminApi.updateFeedback(id, {
        status: nextStatus,
        notes: notes[id]?.trim() || undefined,
      })
      await load(page)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update feedback')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="admin-page">
      <PageHeader
        title="Feedback"
        subtitle="Soft launch feedback from inside the MiniApp."
        actions={
          <div className="admin-filter-bar">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="admin-select">
              <option value="">All categories</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="admin-select">
              <option value="">All statuses</option>
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {error ? <p className="admin-error">{error}</p> : null}
      {actionError ? <p className="admin-error">{actionError}</p> : null}

      <div className="admin-card admin-table-wrap">
        {loading ? <LoadingState /> : null}
        {!loading && rows.length === 0 ? (
          <EmptyState title="No feedback" subtitle="Nothing in this filter yet." />
        ) : null}
        {!loading && rows.length > 0 ? (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Feedback</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.user || row.username || 'User'}</strong>
                      {row.username ? <div className="admin-muted">@{row.username}</div> : null}
                      <div className="admin-muted">
                        {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={row.category} />
                      <p style={{ margin: '0.5rem 0 0', maxWidth: '34rem', whiteSpace: 'pre-wrap' }}>
                        {row.message}
                      </p>
                      {row.page ? <div className="admin-muted">Page: {row.page}</div> : null}
                    </td>
                    <td>{row.rating ? `${row.rating}/5` : '—'}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>
                      <input
                        className="admin-input"
                        style={{ minWidth: '10rem' }}
                        defaultValue={row.notes || ''}
                        placeholder="Internal notes"
                        onChange={(e) => setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      />
                    </td>
                    <td>
                      <div className="admin-row-actions" style={{ marginTop: 0 }}>
                        {STATUSES.filter((item) => item !== row.status).map((item) => (
                          <button
                            key={item}
                            type="button"
                            className={item === 'resolved' ? 'admin-btn-lime' : 'admin-btn-dark'}
                            disabled={busyId === row.id}
                            onClick={() => void update(row.id, item)}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={meta.current_page}
              lastPage={meta.last_page}
              total={meta.total}
              onPage={setPage}
            />
          </>
        ) : null}
      </div>
    </div>
  )
}
