import { useEffect, useState } from 'react'
import {
  adminApi,
  type AdminPhotoRow,
  type AdminVerificationRow,
} from '../../lib/adminApi'
import { EmptyState, Lightbox, LoadingState, PageHeader, Pagination, StatusBadge } from './components/ui'

export function AdminApprovalsPage() {
  const [kind, setKind] = useState<'verifications' | 'photos'>('verifications')
  const [status, setStatus] = useState('pending')
  const [photos, setPhotos] = useState<AdminPhotoRow[]>([])
  const [verifications, setVerifications] = useState<AdminVerificationRow[]>([])
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ total: 0, per_page: 40, current_page: 1, last_page: 1 })
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [lightbox, setLightbox] = useState<string | null>(null)

  async function load(nextPage = page) {
    setLoading(true)
    setError('')
    try {
      if (kind === 'photos') {
        const res = await adminApi.photos({ status: status || undefined, page: nextPage })
        setPhotos(res.data)
        setMeta(res.meta)
      } else {
        const res = await adminApi.verifications({ status: status || undefined, page: nextPage })
        setVerifications(res.data)
        setMeta(res.meta)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
  }, [kind, status])

  useEffect(() => {
    load(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, status, page])

  async function setPhotoStatus(id: number, next: string) {
    setBusyId(id)
    setActionError('')
    try {
      await adminApi.updatePhoto(id, next)
      await load(page)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update photo')
    } finally {
      setBusyId(null)
    }
  }

  async function setVerificationStatus(id: number, next: string) {
    setBusyId(id)
    setActionError('')
    try {
      await adminApi.updateVerification(id, next, notes[id]?.trim() || undefined)
      await load(page)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update verification')
    } finally {
      setBusyId(null)
    }
  }

  const rows = kind === 'photos' ? photos : verifications

  return (
    <div className="admin-page">
      <PageHeader
        title="Approvals"
        subtitle="Compare verification selfies with profile photos, or review uploaded pictures."
        actions={
          <>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as 'verifications' | 'photos')}
              className="admin-select"
            >
              <option value="verifications">Verification selfies</option>
              <option value="photos">Profile photos</option>
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="admin-select">
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </>
        }
      />

      {error ? <p className="admin-error">{error}</p> : null}
      {actionError ? <p className="admin-error">{actionError}</p> : null}
      {loading ? <LoadingState /> : null}

      {!loading && rows.length === 0 ? (
        <div className="admin-card">
          <EmptyState
            title={kind === 'verifications' ? 'No verification requests' : 'No photos in this queue'}
            subtitle="Try another status filter."
          />
        </div>
      ) : null}

      {!loading && kind === 'verifications' ? (
        <div className="admin-verify-grid">
          {verifications.map((row) => (
            <article key={row.id} className="admin-card admin-verify-card">
              <div className="admin-card-head">
                <div>
                  <h3>{row.name || row.username || 'User'}</h3>
                  <p className="admin-muted">
                    @{row.username || 'unknown'} · submitted{' '}
                    {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                  </p>
                </div>
                <StatusBadge status={row.status} />
              </div>

              <div className="admin-verify-compare">
                <div className="admin-verify-panel">
                  <span>Verification selfie</span>
                  <button
                    type="button"
                    onClick={() => setLightbox(row.selfie_url)}
                    style={{ border: 0, padding: 0, background: 'transparent', cursor: 'zoom-in' }}
                  >
                    <img
                      className="admin-verify-selfie"
                      src={row.selfie_url}
                      alt="Verification selfie"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                </div>

                <div className="admin-verify-panel">
                  <span>Profile photos ({row.photos.length})</span>
                  {row.photos.length === 0 ? (
                    <p className="admin-muted">No profile photos uploaded yet.</p>
                  ) : (
                    <div className="admin-verify-photos">
                      {row.photos.map((photo) => (
                        <button
                          key={photo.id}
                          type="button"
                          className={`admin-verify-photo${photo.is_primary ? ' is-primary' : ''}`}
                          onClick={() => setLightbox(photo.image_url)}
                          title={photo.is_primary ? 'Primary photo' : photo.status}
                        >
                          <img src={photo.image_url} alt="" referrerPolicy="no-referrer" />
                          {photo.is_primary ? <span className="admin-verify-photo-tag">Primary</span> : null}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="admin-muted">
                    Confirm the selfie looks like the same person as the profile photos before approving.
                  </p>
                </div>
              </div>

              <label className="admin-muted" style={{ display: 'grid', gap: '0.35rem' }}>
                Review notes (optional)
                <textarea
                  className="admin-notes-input"
                  value={notes[row.id] ?? row.notes ?? ''}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                  placeholder="Why approved or rejected…"
                />
              </label>

              <div className="admin-row-actions">
                <button
                  type="button"
                  className="admin-btn-lime"
                  disabled={busyId === row.id}
                  onClick={() => setVerificationStatus(row.id, 'approved')}
                >
                  {busyId === row.id ? 'Saving…' : 'Approve verified'}
                </button>
                <button
                  type="button"
                  className="admin-btn-dark"
                  disabled={busyId === row.id}
                  onClick={() => setVerificationStatus(row.id, 'rejected')}
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {!loading && kind === 'photos' ? (
        <div className="admin-photo-grid">
          {photos.map((row) => (
            <article key={row.id} className="admin-card admin-photo-card">
              <img
                src={row.image_url}
                alt=""
                referrerPolicy="no-referrer"
                onClick={() => setLightbox(row.image_url)}
              />
              <div>
                <strong>{row.name || row.username || 'User'}</strong>
                <p className="admin-muted">
                  Profile photo · <StatusBadge status={row.status} />
                  {row.is_primary ? ' · Primary' : ''}
                </p>
                <div className="admin-row-actions">
                  <button
                    type="button"
                    className="admin-btn-lime"
                    disabled={busyId === row.id}
                    onClick={() => setPhotoStatus(row.id, 'approved')}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="admin-btn-dark"
                    disabled={busyId === row.id}
                    onClick={() => setPhotoStatus(row.id, 'rejected')}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {!loading && rows.length > 0 ? (
        <Pagination page={meta.current_page} lastPage={meta.last_page} total={meta.total} onPage={setPage} />
      ) : null}

      {lightbox ? <Lightbox src={lightbox} onClose={() => setLightbox(null)} /> : null}
    </div>
  )
}
