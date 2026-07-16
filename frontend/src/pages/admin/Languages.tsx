import { useEffect, useState } from 'react'
import { adminApi } from '../../lib/adminApi'
import { EmptyState, LoadingState, PageHeader } from './components/ui'

export function AdminLanguagesPage() {
  const [languages, setLanguages] = useState<{ name: string; count: number }[]>([])
  const [interests, setInterests] = useState<{ name: string; count: number }[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi
      .languages()
      .then((res) => {
        setLanguages(res.languages)
        setInterests(res.interests)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const spoken = languages.filter((row) => row.count > 0)

  return (
    <div className="admin-page">
      <PageHeader title="Languages" subtitle="Spoken languages and top interests across profiles." />
      {error ? <p className="admin-error">{error}</p> : null}
      {loading ? <LoadingState /> : null}

      {!loading ? (
        <div className="admin-grid admin-grid-2">
          <article className="admin-card">
            <h3>Languages</h3>
            <p className="admin-muted">Configured languages with at least one speaker</p>
            {spoken.length === 0 ? (
              <EmptyState title="No language data" subtitle="Profiles have not set languages yet." />
            ) : (
              spoken.map((row) => (
                <div key={row.name} className="admin-loc">
                  <span>{row.name}</span>
                  <strong>{row.count}</strong>
                </div>
              ))
            )}
          </article>
          <article className="admin-card">
            <h3>Top interests</h3>
            <p className="admin-muted">Most selected interests</p>
            {interests.length === 0 ? <EmptyState title="No interests yet" /> : null}
            {interests.map((row) => (
              <div key={row.name} className="admin-loc">
                <span>{row.name}</span>
                <strong>{row.count}</strong>
              </div>
            ))}
          </article>
        </div>
      ) : null}
    </div>
  )
}
