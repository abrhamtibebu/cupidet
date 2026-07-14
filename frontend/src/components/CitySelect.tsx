import { useMemo, useState } from 'react'
import { ETHIOPIAN_CITIES } from '../lib/cities'

type Props = {
  value: string
  onChange: (city: string) => void
  placeholder?: string
  allowAny?: boolean
  anyLabel?: string
  label?: string
}

export function CitySelect({
  value,
  onChange,
  placeholder = 'Select city',
  allowAny = false,
  anyLabel = 'Any city',
  label,
}: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const options = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = ETHIOPIAN_CITIES.filter((c) => !q || c.toLowerCase().includes(q))
    return list
  }, [query])

  const select = (city: string) => {
    onChange(city)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="relative">
      {label && <label className="mb-2 block text-sm text-muted">{label}</label>}
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3.5 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-lime">◎</span>
        <span className={value ? 'text-white' : 'text-muted'}>{value || placeholder}</span>
        <span className="ml-auto text-xs text-muted">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-2 max-h-64 overflow-hidden rounded-2xl border border-white/10 bg-black">
          <div className="border-b border-white/10 p-2">
            <input
              autoFocus
              className="field w-full py-2.5"
              placeholder="Search cities…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-2">
            {allowAny && (
              <button
                type="button"
                className={`mb-1 w-full rounded-xl px-3 py-2.5 text-left text-sm ${!value ? 'bg-lime text-ink' : 'hover:bg-panel-2'}`}
                onClick={() => select('')}
              >
                {anyLabel}
              </button>
            )}
            {options.map((city) => (
              <button
                key={city}
                type="button"
                className={`mb-1 w-full rounded-xl px-3 py-2.5 text-left text-sm ${
                  value === city ? 'bg-lime text-ink' : 'hover:bg-panel-2'
                }`}
                onClick={() => select(city)}
              >
                {city}
              </button>
            ))}
            {options.length === 0 && <p className="px-3 py-4 text-center text-sm text-muted">No cities found</p>}
          </div>
        </div>
      )}
    </div>
  )
}
