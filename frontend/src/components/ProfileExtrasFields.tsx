import {
  CHILDREN_OPTIONS,
  DRINKING_OPTIONS,
  LANGUAGES,
  PETS_OPTIONS,
  PROFILE_PROMPTS,
  SMOKING_OPTIONS,
} from '../lib/profileOptions'
import type { ProfilePrompt } from '../types'

type DetailFields = {
  height_cm: string
  education: string
  occupation: string
  religion: string
  languages: string[]
  children: string
  pets: string
  drinking: string
  smoking: string
  hobbies: string
}

type Props = {
  form: DetailFields
  prompts: ProfilePrompt[]
  disabled?: boolean
  showPrompts?: boolean
  onChange: (patch: Partial<DetailFields>) => void
  onPromptsChange: (prompts: ProfilePrompt[]) => void
}

function ChipRow({
  label,
  options,
  value,
  disabled,
  onSelect,
}: {
  label: string
  options: readonly { id: string; label: string }[]
  value: string
  disabled?: boolean
  onSelect: (id: string) => void
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={disabled}
            className={`chip ${value === o.id ? 'chip-active' : ''}`}
            onClick={() => onSelect(value === o.id ? '' : o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ProfileExtrasFields({
  form,
  prompts,
  disabled,
  showPrompts = true,
  onChange,
  onPromptsChange,
}: Props) {
  const toggleLanguage = (lang: string) => {
    const next = form.languages.includes(lang)
      ? form.languages.filter((l) => l !== lang)
      : [...form.languages, lang]
    onChange({ languages: next })
  }

  const setPrompt = (key: string, answer: string) => {
    const existing = prompts.find((p) => p.prompt_key === key)
    if (!answer.trim()) {
      onPromptsChange(prompts.filter((p) => p.prompt_key !== key))
      return
    }
    if (existing) {
      onPromptsChange(prompts.map((p) => (p.prompt_key === key ? { ...p, answer } : p)))
      return
    }
    if (prompts.length >= 3) return
    const label = PROFILE_PROMPTS.find((p) => p.key === key)?.label
    onPromptsChange([...prompts, { prompt_key: key, label, answer }])
  }

  const selectedKeys = new Set(prompts.map((p) => p.prompt_key))

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">All of these are optional — add what you&apos;re comfortable sharing.</p>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Height (cm)</span>
        <input
          className="field"
          type="number"
          min={120}
          max={230}
          disabled={disabled}
          placeholder="e.g. 170"
          value={form.height_cm}
          onChange={(e) => onChange({ height_cm: e.target.value })}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Education</span>
        <input
          className="field"
          disabled={disabled}
          placeholder="School or degree"
          value={form.education}
          onChange={(e) => onChange({ education: e.target.value })}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Occupation</span>
        <input
          className="field"
          disabled={disabled}
          placeholder="What do you do?"
          value={form.occupation}
          onChange={(e) => onChange({ occupation: e.target.value })}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Religion</span>
        <input
          className="field"
          disabled={disabled}
          placeholder="Optional"
          value={form.religion}
          onChange={(e) => onChange({ religion: e.target.value })}
        />
      </label>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">Languages spoken</p>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              disabled={disabled}
              className={`chip ${form.languages.includes(lang) ? 'chip-active' : ''}`}
              onClick={() => toggleLanguage(lang)}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      <ChipRow
        label="Children"
        options={CHILDREN_OPTIONS}
        value={form.children}
        disabled={disabled}
        onSelect={(children) => onChange({ children })}
      />
      <ChipRow
        label="Pets"
        options={PETS_OPTIONS}
        value={form.pets}
        disabled={disabled}
        onSelect={(pets) => onChange({ pets })}
      />
      <ChipRow
        label="Drinking"
        options={DRINKING_OPTIONS}
        value={form.drinking}
        disabled={disabled}
        onSelect={(drinking) => onChange({ drinking })}
      />
      <ChipRow
        label="Smoking"
        options={SMOKING_OPTIONS}
        value={form.smoking}
        disabled={disabled}
        onSelect={(smoking) => onChange({ smoking })}
      />

      <label className="block space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
          Hobbies (comma separated)
        </span>
        <input
          className="field"
          disabled={disabled}
          placeholder="Coffee, hiking, football…"
          value={form.hobbies}
          onChange={(e) => onChange({ hobbies: e.target.value })}
        />
      </label>

      {showPrompts && (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
              Profile prompts ({prompts.length}/3)
            </p>
            <p className="mt-1 text-xs text-muted">Pick up to 3 prompts that show personality.</p>
          </div>
          {PROFILE_PROMPTS.map((prompt) => {
            const active = selectedKeys.has(prompt.key)
            const answer = prompts.find((p) => p.prompt_key === prompt.key)?.answer || ''
            const lockedOut = !active && prompts.length >= 3
            return (
              <div key={prompt.key} className={`rounded-2xl bg-black/25 p-3 ${lockedOut ? 'opacity-40' : ''}`}>
                <button
                  type="button"
                  disabled={disabled || lockedOut}
                  className={`text-left text-sm font-semibold ${active ? 'text-lime' : 'text-white/80'}`}
                  onClick={() => {
                    if (active) setPrompt(prompt.key, '')
                    else if (!lockedOut) setPrompt(prompt.key, ' ')
                  }}
                >
                  {prompt.label}
                </button>
                {active && (
                  <textarea
                    className="field mt-2 min-h-20"
                    disabled={disabled}
                    maxLength={150}
                    placeholder="Your answer"
                    value={answer.trim() === '' ? '' : answer}
                    onChange={(e) => setPrompt(prompt.key, e.target.value)}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function parseHobbies(raw: string): string[] {
  return raw
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean)
    .slice(0, 12)
}

export function emptyDetailFields(): DetailFields {
  return {
    height_cm: '',
    education: '',
    occupation: '',
    religion: '',
    languages: [],
    children: '',
    pets: '',
    drinking: '',
    smoking: '',
    hobbies: '',
  }
}
