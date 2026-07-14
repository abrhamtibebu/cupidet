import { useEffect, useState } from 'react'
import { adminApi } from '../../lib/adminApi'

export function AdminLanguagesPage() {
  const [languages, setLanguages] = useState<{ name: string; count: number }[]>([])
  const [interests, setInterests] = useState<{ name: string; count: number }[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi
      .languages()
      .then((res) => {
        setLanguages(res.languages)
        setInterests(res.interests)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [])

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1>Languages</h1>
          <p className="admin-muted">Spoken languages and top interests.</p>
        </div>
      </header>
      {error ? <p className="admin-error">{error}</p> : null}
      <div className="admin-grid admin-grid-2">
        <article className="admin-card">
          <h3>Languages</h3>
          {languages.map((row) => (
            <div key={row.name} className="admin-loc">
              <span>{row.name}</span>
              <strong>{row.count}</strong>
            </div>
          ))}
        </article>
        <article className="admin-card">
          <h3>Top interests</h3>
          {interests.map((row) => (
            <div key={row.name} className="admin-loc">
              <span>{row.name}</span>
              <strong>{row.count}</strong>
            </div>
          ))}
        </article>
      </div>
    </div>
  )
}
