import { useEffect, useState } from 'react'
import { adminApi } from '../../lib/adminApi'

export function AdminApprovalsPage() {
  const [kind, setKind] = useState<'photos' | 'verifications'>('photos')
  const [status, setStatus] = useState('pending')
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [error, setError] = useState('')

  async function load() {
    const res =
      kind === 'photos'
        ? await adminApi.photos(status || undefined)
        : await adminApi.verifications(status || undefined)
    setRows(res.data)
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [kind, status])

  async function setPhotoStatus(id: number, next: string) {
    await adminApi.updatePhoto(id, next)
    await load()
  }

  async function setVerificationStatus(id: number, next: string) {
    await adminApi.updateVerification(id, next)
    await load()
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1>Approvals</h1>
          <p className="admin-muted">
            Review uploaded profile photos and verification selfies.
          </p>
        </div>
        <div className="admin-row-actions">
          <select value={kind} onChange={(e) => setKind(e.target.value as 'photos' | 'verifications')} className="admin-select">
            <option value="photos">Profile photos</option>
            <option value="verifications">Verification selfies</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="admin-select">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </header>
      {error ? <p className="admin-error">{error}</p> : null}
      <div className="admin-photo-grid">
        {rows.map((row) => (
          <article key={String(row.id)} className="admin-card admin-photo-card">
            <img
              src={String(kind === 'photos' ? row.image_url : row.selfie_url)}
              alt=""
              referrerPolicy="no-referrer"
            />
            <div>
              <strong>{String(row.name || row.username || 'User')}</strong>
              <p className="admin-muted">
                {kind === 'verifications' ? 'Verification selfie' : 'Profile photo'} · {String(row.status)}
              </p>
              {kind === 'verifications' ? (
                <p className="admin-muted">Expected review window: 2–48 hours</p>
              ) : null}
              <div className="admin-row-actions">
                <button
                  type="button"
                  className="admin-btn-lime"
                  onClick={() =>
                    kind === 'photos'
                      ? setPhotoStatus(Number(row.id), 'approved')
                      : setVerificationStatus(Number(row.id), 'approved')
                  }
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="admin-btn-dark"
                  onClick={() =>
                    kind === 'photos'
                      ? setPhotoStatus(Number(row.id), 'rejected')
                      : setVerificationStatus(Number(row.id), 'rejected')
                  }
                >
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
