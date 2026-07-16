import type { ReactNode } from 'react'

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <header className="admin-page-head">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p className="admin-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="admin-filter-bar">{actions}</div> : null}
    </header>
  )
}

export function StatCard({
  label,
  value,
  hint,
  spark,
  sparkColor = '#c5e000',
}: {
  label: string
  value: string | number
  hint?: string
  spark?: number[]
  sparkColor?: string
}) {
  return (
    <article className="admin-card admin-stat">
      <p className="admin-muted">{label}</p>
      <strong>{typeof value === 'number' ? value.toLocaleString() : value}</strong>
      {hint ? <span className="admin-muted">{hint}</span> : null}
      {spark && spark.length > 0 ? <Spark values={spark} color={sparkColor} /> : null}
    </article>
  )
}

function Spark({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1)
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * 100
      const y = 100 - (v / max) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg className="admin-spark" viewBox="0 0 100 40" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="2.5" points={points} />
    </svg>
  )
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="admin-empty">
      <p>{title}</p>
      {subtitle ? <span className="admin-muted">{subtitle}</span> : null}
    </div>
  )
}

export function LoadingState({ rows = 4 }: { rows?: number }) {
  return (
    <div className="admin-loading" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="admin-skeleton" style={{ width: `${88 - i * 8}%` }} />
      ))}
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/\s+/g, '-')
  return <span className={`admin-badge admin-badge-${key}`}>{status}</span>
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="admin-filter-bar">{children}</div>
}

export function Pagination({
  page,
  lastPage,
  total,
  onPage,
}: {
  page: number
  lastPage: number
  total: number
  onPage: (page: number) => void
}) {
  if (lastPage <= 1) {
    return total > 0 ? (
      <div className="admin-pagination">
        <span>{total.toLocaleString()} total</span>
      </div>
    ) : null
  }

  return (
    <div className="admin-pagination">
      <span>
        Page {page} of {lastPage} · {total.toLocaleString()} total
      </span>
      <div className="admin-row-actions" style={{ marginTop: 0 }}>
        <button type="button" className="admin-btn-ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button
          type="button"
          className="admin-btn-ghost"
          disabled={page >= lastPage}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}

export function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <button type="button" className="admin-lightbox" onClick={onClose} aria-label="Close preview">
      <img src={src} alt="" referrerPolicy="no-referrer" onClick={(e) => e.stopPropagation()} />
    </button>
  )
}
