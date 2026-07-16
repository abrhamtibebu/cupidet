import { useEffect, useState } from 'react'
import { adminApi, type AdminReportRow } from '../../lib/adminApi'
import { EmptyState, LoadingState, PageHeader, Pagination, StatusBadge } from './components/ui'

export function AdminReportsPage() {
  const [status, setStatus] = useState('open')
  const [rows, setRows] = useState<AdminReportRow[]>([])
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ total: 0, per_page: 50, current_page: 1, last_page: 1 })
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})

  async function load(nextPage = page) {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.reports({ status: status || undefined, page: nextPage })
      setRows(res.data)
      setMeta(res.meta)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
  }, [status])

  useEffect(() => {
    load(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page])

  async function update(id: number, nextStatus: string) {
    setBusyId(id)
    setActionError('')
    try {
      await adminApi.updateReport(id, {
        status: nextStatus,
        notes: notes[id]?.trim() || undefined,
      })
      await load(page)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update report')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="admin-page">
      <PageHeader
        title="Reports"
        subtitle="User safety reports and moderation notes."
        actions={
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="admin-select"
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="reviewing">Reviewing</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        }
      />
      {error ? <p className="admin-error">{error}</p> : null}
      {actionError ? <p className="admin-error">{actionError}</p> : null}

      <div className="admin-card admin-table-wrap">
        {loading ? <LoadingState /> : null}
        {!loading && rows.length === 0 ? (
          <EmptyState title="No reports" subtitle="Nothing in this filter." />
        ) : null}
        {!loading && rows.length > 0 ? (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Reporter</th>
                  <th>Reported</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.reporter ?? '—'}</td>
                    <td>{row.reported ?? '—'}</td>
                    <td>
                      <div>{row.reason}</div>
                      {row.details ? <div className="admin-muted">{row.details}</div> : null}
                    </td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>
                      <input
                        className="admin-input"
                        style={{ minWidth: '8rem' }}
                        defaultValue={row.notes || ''}
                        placeholder="Notes"
                        onChange={(e) => setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      />
                    </td>
                    <td>
                      <div className="admin-row-actions" style={{ marginTop: 0 }}>
                        {row.status === 'open' ? (
                          <button
                            type="button"
                            className="admin-btn-ghost"
                            disabled={busyId === row.id}
                            onClick={() => update(row.id, 'reviewing')}
                          >
                            Review
                          </button>
                        ) : null}
                        {row.status === 'open' || row.status === 'reviewing' ? (
                          <>
                            <button
                              type="button"
                              className="admin-btn-lime"
                              disabled={busyId === row.id}
                              onClick={() => update(row.id, 'resolved')}
                            >
                              Resolve
                            </button>
                            <button
                              type="button"
                              className="admin-btn-dark"
                              disabled={busyId === row.id}
                              onClick={() => update(row.id, 'dismissed')}
                            >
                              Dismiss
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
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
