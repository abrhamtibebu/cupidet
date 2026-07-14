import { useEffect, useMemo, useState } from 'react'

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

function daysInMonth(year: number, month: number) {
  if (!year || !month) return 31
  return new Date(year, month, 0).getDate()
}

function parseIso(iso: string) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return { year: 0, month: 0, day: 0 }
  }
  const [y, m, d] = iso.split('-').map(Number)
  return { year: y || 0, month: m || 0, day: d || 0 }
}

export function ageFromIso(iso: string): number | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [y, m, d] = iso.split('-').map(Number)
  const birth = new Date(y, m - 1, d)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  if (beforeBirthday) age -= 1
  return age
}

export function isAtLeast18(iso: string): boolean {
  const age = ageFromIso(iso)
  return age !== null && age >= 18
}

type Draft = { year: number; month: number; day: number }

type Props = {
  value: string
  onChange: (iso: string) => void
}

export function BirthDateFields({ value, onChange }: Props) {
  const [draft, setDraft] = useState<Draft>(() => parseIso(value))

  useEffect(() => {
    // Only sync a complete date from the parent — don't wipe in-progress picks
    if (!value) return
    setDraft(parseIso(value))
  }, [value])

  const thisYear = new Date().getFullYear()
  const years = useMemo(
    () => Array.from({ length: 83 }, (_, i) => thisYear - 13 - i),
    [thisYear],
  )

  const maxDay = daysInMonth(draft.year || thisYear - 20, draft.month || 1)

  const commit = (next: Draft) => {
    const day =
      next.day && next.month && next.year
        ? Math.min(next.day, daysInMonth(next.year, next.month))
        : next.day
    const normalized = { ...next, day }
    setDraft(normalized)

    if (normalized.year && normalized.month && normalized.day) {
      const iso = `${normalized.year}-${String(normalized.month).padStart(2, '0')}-${String(normalized.day).padStart(2, '0')}`
      onChange(iso)
      return
    }

    // Keep draft locally; only clear parent if it previously had a full date
    if (value) onChange('')
  }

  const age = ageFromIso(value)
  const oldEnough = age !== null && age >= 18
  const incomplete = Boolean(draft.day || draft.month || draft.year) && !(draft.day && draft.month && draft.year)

  return (
    <div className="space-y-3 rounded-[22px] border border-white/10 bg-panel p-4">
      <div>
        <p className="text-sm font-semibold text-white">Birthday</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Enter the day, month, and year you were born. You must be 18 or older to join Cupid ET.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Day</span>
          <select
            className="field bg-[#1e1e1e] px-3 text-white"
            value={draft.day ? String(draft.day) : ''}
            onChange={(e) =>
              commit({ ...draft, day: e.target.value ? Number(e.target.value) : 0 })
            }
            aria-label="Birth day"
          >
            <option value="">DD</option>
            {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
              <option key={d} value={String(d)}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Month</span>
          <select
            className="field bg-[#1e1e1e] px-2 text-white"
            value={draft.month ? String(draft.month) : ''}
            onChange={(e) =>
              commit({ ...draft, month: e.target.value ? Number(e.target.value) : 0 })
            }
            aria-label="Birth month"
          >
            <option value="">MM</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={String(m.value)}>
                {m.label.slice(0, 3)}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Year</span>
          <select
            className="field bg-[#1e1e1e] px-2 text-white"
            value={draft.year ? String(draft.year) : ''}
            onChange={(e) =>
              commit({ ...draft, year: e.target.value ? Number(e.target.value) : 0 })
            }
            aria-label="Birth year"
          >
            <option value="">YYYY</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      {incomplete && (
        <p className="text-xs text-muted">Choose day, month, and year to continue.</p>
      )}

      {age !== null && (
        <p className={`text-sm font-semibold ${oldEnough ? 'text-lime' : 'text-red-300'}`}>
          {oldEnough
            ? `You’re ${age} — you can continue.`
            : `You’re ${age}. Cupid ET is only for people 18 and older.`}
        </p>
      )}
    </div>
  )
}
