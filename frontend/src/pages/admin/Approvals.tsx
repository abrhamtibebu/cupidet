import { useEffect, useState } from 'react'
import { adminApi } from '../../lib/adminApi'

export function AdminApprovalsPage() {
  const [status, setStatus] = useState('pending')
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [error, setError] = useState('')

  async function load() {
    const res = await adminApi.photos(status || undefined)
    setRows(res.data)
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [status])

  async function setPhotoStatus(id: number, next: string) {
    await adminApi.updatePhoto(id, next)
    await load()
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1>Approvals</h1>
          <p className="admin-muted">Review uploaded profile photos.</p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="admin-select">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </header>
      {error ? <p className="admin-error">{error}</p> : null}
      <div className="admin-photo-grid">
        {rows.map((row) => (
          <article key={String(row.id)} className="admin-card admin-photo-card">
            <img src={String(row.image_url)} alt="" referrerPolicy="no-referrer" />
            <div>
              <strong>{String(row.name || row.username || 'User')}</strong>
              <p className="admin-muted">{String(row.status)}</p>
              <div className="admin-row-actions">
                <button type="button" className="admin-btn-lime" onClick={() => setPhotoStatus(Number(row.id), 'approved')}>
                  Approve
                </button>
                <button type="button" className="admin-btn-dark" onClick={() => setPhotoStatus(Number(row.id), 'rejected')}>
                  Reject
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
