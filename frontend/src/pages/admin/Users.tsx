import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminApi, type AdminUserRow } from '../../lib/adminApi'
import { EmptyState, LoadingState, PageHeader, Pagination, StatusBadge } from './components/ui'

export function AdminUsersPage() {
  const [params, setParams] = useSearchParams()
  const qParam = params.get('q') || ''
  const [bucket, setBucket] = useState('all')
  const [q, setQ] = useState(qParam)
  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ total: 0, per_page: 50, current_page: 1, last_page: 1 })
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    setQ(qParam)
    setPage(1)
  }, [qParam])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    adminApi
      .users({
        bucket: bucket === 'all' ? 'all' : bucket,
        q: qParam || undefined,
        page,
      })
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
  }, [bucket, qParam, page])

  async function patchUser(id: number, body: { status?: string; verified?: boolean }) {
    if (body.status === 'suspended') {
      const ok = window.confirm(
        'Suspend this account? They will see a suspension screen and cannot use the app until restored.',
      )
      if (!ok) return
    }
    if (body.status === 'banned') {
      const ok = window.confirm(
        'Ban this account permanently? They will see a banned screen and cannot sign in.',
      )
      if (!ok) return
    }
    if (body.status === 'active') {
      const ok = window.confirm('Restore this account to active? They will regain full access.')
      if (!ok) return
    }

    setBusyId(id)
    setActionError('')
    try {
      await adminApi.updateUser(id, body)
      const res = await adminApi.users({
        bucket: bucket === 'all' ? 'all' : bucket,
        q: qParam || undefined,
        page,
      })
      setRows(res.data)
      setMeta(res.meta)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update user')
    } finally {
      setBusyId(null)
    }
  }

  function submitSearch(e: FormEvent) {
    e.preventDefault()
    const next = new URLSearchParams(params)
    if (q.trim()) next.set('q', q.trim())
    else next.delete('q')
    setParams(next)
    setPage(1)
  }

  return (
    <div className="admin-page">
        <PageHeader
        title="Users"
        subtitle="Search, filter, and moderate community accounts. Suspend blocks access until restored; ban is permanent."
        actions={
          <>
            <form onSubmit={submitSearch} className="admin-filter-bar">
              <input
                className="admin-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name or username"
              />
              <button type="submit" className="admin-btn-ghost">
                Search
              </button>
            </form>
            <select
              value={bucket}
              onChange={(e) => {
                setBucket(e.target.value)
                setPage(1)
              }}
              className="admin-select"
            >
              <option value="all">All users</option>
              <option value="online">Online (24h)</option>
              <option value="new">New (14d)</option>
            </select>
          </>
        }
      />

      {error ? <p className="admin-error">{error}</p> : null}
      {actionError ? <p className="admin-error">{actionError}</p> : null}

      <div className="admin-card admin-table-wrap">
        {loading ? <LoadingState /> : null}
        {!loading && rows.length === 0 ? (
          <EmptyState title="No users found" subtitle="Try another filter or search." />
        ) : null}
        {!loading && rows.length > 0 ? (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Verified</th>
                  <th>Last active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="admin-user-cell">
                        {row.photo_url ? (
                          <img src={row.photo_url} alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="admin-user-avatar">
                            {(row.name || row.username || '?').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <strong>{row.name || '—'}</strong>
                          <div className="admin-muted">@{row.username || 'unknown'} · #{row.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>{row.location || '—'}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>{row.verified ? <span className="admin-ok">Yes</span> : 'No'}</td>
                    <td>{row.last_active ? new Date(row.last_active).toLocaleString() : '—'}</td>
                    <td>
                      <div className="admin-row-actions" style={{ marginTop: 0 }}>
                        <button
                          type="button"
                          className="admin-btn-lime"
                          disabled={busyId === row.id || row.verified}
                          onClick={() => patchUser(row.id, { verified: true })}
                        >
                          Verify
                        </button>
                        <button
                          type="button"
                          className="admin-btn-ghost"
                          disabled={busyId === row.id || row.status === 'suspended'}
                          onClick={() => patchUser(row.id, { status: 'suspended' })}
                        >
                          Suspend
                        </button>
                        <button
                          type="button"
                          className="admin-btn-dark"
                          disabled={busyId === row.id || row.status === 'banned'}
                          onClick={() => patchUser(row.id, { status: 'banned' })}
                        >
                          Ban
                        </button>
                        {row.status === 'suspended' || row.status === 'banned' || row.status === 'hidden' ? (
                          <button
                            type="button"
                            className="admin-btn-ghost"
                            disabled={busyId === row.id}
                            onClick={() => patchUser(row.id, { status: 'active' })}
                          >
                            Restore
                          </button>
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
