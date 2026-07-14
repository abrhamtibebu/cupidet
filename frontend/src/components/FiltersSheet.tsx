import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CitySelect } from './CitySelect'
import { AgeRangeSlider, datingPreferredGender } from './AgeRangeSlider'
import { LANGUAGES, RELATIONSHIP_GOALS, isCasualGoal } from '../lib/profileOptions'
import type { Interest } from '../types'

export type FilterState = {
  preferred_gender: string
  min_age: number
  max_age: number
  preferred_location: string
  relationship_goal?: string
  max_distance_km?: number
  preferred_languages?: string[]
  preferred_interest_ids?: number[]
}

type Props = {
  open: boolean
  initial: FilterState
  userGender?: string
  interests?: Interest[]
  onClose: () => void
  onSave: (filters: FilterState) => void
}

const lookingFor = [
  { id: 'female', label: 'Women' },
  { id: 'male', label: 'Men' },
  { id: 'any', label: 'Everyone' },
]

export function FiltersSheet({
  open,
  initial,
  userGender = 'other',
  interests = [],
  onClose,
  onSave,
}: Props) {
  const [filters, setFilters] = useState<FilterState>(initial)
  const datingLocked = isCasualGoal(filters.relationship_goal)
    ? datingPreferredGender(userGender)
    : null

  useEffect(() => {
    if (!open) return
    const next = {
      ...initial,
      preferred_languages: initial.preferred_languages || [],
      preferred_interest_ids: initial.preferred_interest_ids || [],
    }
    const locked = isCasualGoal(next.relationship_goal) ? datingPreferredGender(userGender) : null
    if (locked) next.preferred_gender = locked
    next.min_age = Math.max(18, next.min_age || 18)
    next.max_age = Math.max(next.min_age, next.max_age || 40)
    setFilters(next)
  }, [open, initial, userGender])

  const toggleLanguage = (lang: string) => {
    const current = filters.preferred_languages || []
    setFilters({
      ...filters,
      preferred_languages: current.includes(lang)
        ? current.filter((l) => l !== lang)
        : [...current, lang],
    })
  }

  const toggleInterest = (id: number) => {
    const current = filters.preferred_interest_ids || []
    setFilters({
      ...filters,
      preferred_interest_ids: current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id],
    })
  }

  const save = () => {
    const payload = { ...filters }
    if (datingLocked) payload.preferred_gender = datingLocked
    payload.min_age = Math.max(18, payload.min_age)
    payload.max_age = Math.max(payload.min_age, payload.max_age)
    onSave(payload)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="h-[90dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] bg-black p-5"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            <div className="mb-6 flex items-center justify-between">
              <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-panel" onClick={onClose}>
                ←
              </button>
              <h2 className="text-lg font-bold">Smart Filters</h2>
              <button
                type="button"
                className="rounded-full bg-lime px-4 py-2 text-sm font-bold text-ink"
                onClick={save}
              >
                Save
              </button>
            </div>

            <div className="mb-6">
              <CitySelect
                label="City"
                value={filters.preferred_location}
                allowAny
                anyLabel="Any city"
                placeholder="Filter by city"
                onChange={(city) => setFilters({ ...filters, preferred_location: city })}
              />
            </div>

            <p className="mb-2 text-sm font-semibold">Distance</p>
            <p className="mb-2 text-xs text-muted">{filters.max_distance_km || 50} km</p>
            <input
              type="range"
              min={1}
              max={200}
              value={filters.max_distance_km || 50}
              className="mb-6 w-full accent-[var(--color-lime)]"
              onChange={(e) => setFilters({ ...filters, max_distance_km: Number(e.target.value) })}
            />

            <div className="mb-6">
              <AgeRangeSlider
                minAge={filters.min_age}
                maxAge={filters.max_age}
                onChange={(min_age, max_age) => setFilters({ ...filters, min_age, max_age })}
              />
            </div>

            <p className="mb-3 text-sm font-semibold">Looking For</p>
            {datingLocked ? (
              <div className="mb-6 space-y-2">
                <p className="text-xs text-muted">
                  Casual dating shows {datingLocked === 'female' ? 'women' : 'men'} only.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="chip chip-active">
                    {datingLocked === 'female' ? 'Women' : 'Men'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mb-6 flex flex-wrap gap-2">
                {lookingFor.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={`chip ${filters.preferred_gender === g.id ? 'chip-active' : ''}`}
                    onClick={() => setFilters({ ...filters, preferred_gender: g.id })}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            )}

            <p className="mb-3 text-sm font-semibold">Relationship intention</p>
            <div className="mb-6 flex flex-wrap gap-2">
              {RELATIONSHIP_GOALS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`chip ${filters.relationship_goal === g.id ? 'chip-active' : ''}`}
                  onClick={() => {
                    const locked = isCasualGoal(g.id) ? datingPreferredGender(userGender) : null
                    setFilters({
                      ...filters,
                      relationship_goal: g.id,
                      preferred_gender: locked || filters.preferred_gender,
                    })
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>

            <p className="mb-3 text-sm font-semibold">Languages</p>
            <div className="mb-6 flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => {
                const active = (filters.preferred_languages || []).includes(lang)
                return (
                  <button
                    key={lang}
                    type="button"
                    className={`chip ${active ? 'chip-active' : ''}`}
                    onClick={() => toggleLanguage(lang)}
                  >
                    {lang}
                  </button>
                )
              })}
            </div>

            {interests.length > 0 && (
              <>
                <p className="mb-3 text-sm font-semibold">Interests</p>
                <div className="mb-8 flex flex-wrap gap-2">
                  {interests.map((interest) => {
                    const active = (filters.preferred_interest_ids || []).includes(interest.id)
                    return (
                      <button
                        key={interest.id}
                        type="button"
                        className={`chip ${active ? 'chip-active' : ''}`}
                        onClick={() => toggleInterest(interest.id)}
                      >
                        {interest.name}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            <button type="button" className="btn-lime w-full py-3.5" onClick={save}>
              Show results
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
