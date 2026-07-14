import { useEffect, useMemo, useState } from 'react'
import imageCompression from 'browser-image-compression'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { resolveMediaUrl } from '../lib/media'
import { getTelegramUserUnsafe, telegramHaptic } from '../lib/telegram'
import { CitySelect } from '../components/CitySelect'
import { BirthDateFields, isAtLeast18 } from '../components/BirthDateFields'
import { AgeRangeSlider, datingPreferredGender } from '../components/AgeRangeSlider'
import {
  ProfileExtrasFields,
  emptyDetailFields,
  parseHobbies,
} from '../components/ProfileExtrasFields'
import { PROFILE_PROMPTS, RELATIONSHIP_GOALS, isCasualGoal } from '../lib/profileOptions'
import type { Interest, ProfilePrompt } from '../types'

const steps = ['About you', 'Photos', 'Interests', 'Looking for', 'Details', 'Prompts']

function telegramDisplayName(user: {
  profile?: { name?: string } | null
  first_name?: string | null
  last_name?: string | null
} | null): string {
  if (user?.profile?.name?.trim()) return user.profile.name.trim()
  const fromUser = `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
  if (fromUser) return fromUser
  const tg = getTelegramUserUnsafe()
  if (!tg) return ''
  return `${tg.first_name || ''} ${tg.last_name || ''}`.trim()
}

function telegramPhotoUrl(user: {
  photos?: { image_url: string; is_primary: boolean }[]
  photo_url?: string | null
} | null): string | null {
  const primary = user?.photos?.find((p) => p.is_primary) || user?.photos?.[0]
  if (primary?.image_url) return resolveMediaUrl(primary.image_url)
  if (user?.photo_url) return resolveMediaUrl(user.photo_url)
  return getTelegramUserUnsafe()?.photo_url || null
}

export function OnboardingPage() {
  const { refresh, user, logout } = useAuth()
  const [step, setStep] = useState(0)
  const [interests, setInterests] = useState<Interest[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const syncedPhoto = telegramPhotoUrl(user)
  const [preview, setPreview] = useState<string | null>(syncedPhoto)
  const [photoFromTelegram] = useState(Boolean(syncedPhoto))
  const [prompts, setPrompts] = useState<ProfilePrompt[]>([])
  const [form, setForm] = useState({
    name: telegramDisplayName(user),
    birth_date: user?.profile?.birth_date?.slice(0, 10) || '',
    gender: user?.profile?.gender || 'female',
    location: user?.profile?.location || 'Addis Ababa',
    latitude: (user?.profile?.latitude as number | null | undefined) ?? null,
    longitude: (user?.profile?.longitude as number | null | undefined) ?? null,
    bio: user?.profile?.bio || '',
    relationship_goal: user?.profile?.relationship_goal || 'casual',
    interest_ids: [] as number[],
    preferred_gender: (datingPreferredGender(user?.profile?.gender || 'female') || 'male') as string,
    min_age: 18,
    max_age: 35,
    preferred_location: '',
    ...emptyDetailFields(),
  })

  useEffect(() => {
    api.interests().then((res) => setInterests(res.interests)).catch(() => undefined)
  }, [])

  const title = useMemo(() => steps[step], [step])
  const canContinueAbout =
    Boolean(form.name.trim()) && Boolean(form.birth_date) && isAtLeast18(form.birth_date)

  const toggleInterest = (id: number) => {
    setForm((prev) => ({
      ...prev,
      interest_ids: prev.interest_ids.includes(id)
        ? prev.interest_ids.filter((x) => x !== id)
        : [...prev.interest_ids, id].slice(0, 8),
    }))
  }

  const rejectUnderage = async () => {
    setSaving(true)
    setError('')
    try {
      await api.deleteAccount().catch(() => undefined)
    } finally {
      sessionStorage.setItem('cupid_underage', '1')
      localStorage.removeItem('cupid_intro_v2')
      logout()
      setSaving(false)
      telegramHaptic('error')
    }
  }

  const continueAboutYou = () => {
    setError('')
    if (!form.name.trim()) {
      setError('Please enter your display name.')
      return
    }
    if (!form.birth_date) {
      setError('Please enter your birthday.')
      return
    }
    if (!isAtLeast18(form.birth_date)) {
      void rejectUnderage()
      return
    }
    setStep(1)
  }

  const saveProfile = async () => {
    if (!isAtLeast18(form.birth_date)) {
      void rejectUnderage()
      return
    }
    const datingPref = datingPreferredGender(form.gender)
    const preferred_gender =
      isCasualGoal(form.relationship_goal) && datingPref ? datingPref : form.preferred_gender

    const payload = {
      name: form.name,
      birth_date: form.birth_date,
      gender: form.gender,
      location: form.location,
      latitude: form.latitude,
      longitude: form.longitude,
      bio: form.bio,
      relationship_goal: form.relationship_goal,
      interest_ids: form.interest_ids,
      preferred_gender,
      min_age: Math.max(18, form.min_age),
      max_age: Math.max(form.min_age, form.max_age),
      preferred_location: form.preferred_location || null,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      education: form.education || null,
      occupation: form.occupation || null,
      religion: form.religion || null,
      languages: form.languages,
      children: form.children || null,
      pets: form.pets || null,
      drinking: form.drinking || null,
      smoking: form.smoking || null,
      hobbies: parseHobbies(form.hobbies),
      prompts: prompts
        .filter((p) => p.answer.trim())
        .slice(0, 3)
        .map((p) => ({ prompt_key: p.prompt_key, answer: p.answer.trim() })),
    }

    setSaving(true)
    setError('')
    try {
      await api.saveProfile(payload)
      telegramHaptic('success')
      await refresh()
    } catch (e) {
      telegramHaptic('error')
      const message = e instanceof Error ? e.message : 'Could not save profile'
      if (/18|birth|age/i.test(message)) {
        void rejectUnderage()
        return
      }
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const uploadPhoto = async (file: File) => {
    setSaving(true)
    setError('')
    try {
      setPreview(URL.createObjectURL(file))
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1400,
        useWebWorker: true,
      })
      await api.uploadPhoto(compressed, true)
      setStep(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setSaving(false)
    }
  }

  const setPrompt = (key: string, answer: string) => {
    const existing = prompts.find((p) => p.prompt_key === key)
    if (!answer.trim()) {
      setPrompts(prompts.filter((p) => p.prompt_key !== key))
      return
    }
    if (existing) {
      setPrompts(prompts.map((p) => (p.prompt_key === key ? { ...p, answer } : p)))
      return
    }
    if (prompts.length >= 3) return
    const label = PROFILE_PROMPTS.find((p) => p.key === key)?.label
    setPrompts([...prompts, { prompt_key: key, label, answer }])
  }

  return (
    <div className="app-shell">
      <div className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-lime">Onboarding</div>
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-full bg-panel text-white/70"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          ←
        </button>
        <p className="text-sm font-semibold text-white/90">{title}</p>
        <span className="rounded-full bg-panel px-2.5 py-1 text-xs text-lime">
          {step + 1}/{steps.length}
        </span>
      </div>

      <div className="mb-6 flex gap-1.5">
        {steps.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-lime' : 'bg-white/10'}`} />
        ))}
      </div>

      {error && <p className="mb-4 rounded-2xl bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
        >
          {step === 0 && (
            <div className="space-y-3">
              <p className="mb-2 text-sm text-muted">Tell people who you are.</p>
              {(form.name || syncedPhoto) && (
                <div className="mb-1 flex items-center gap-3 rounded-[22px] border border-lime/20 bg-panel px-3 py-3">
                  {syncedPhoto ? (
                    <img
                      src={syncedPhoto}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover ring-2 ring-lime/40"
                    />
                  ) : (
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-lime text-lg font-bold text-ink">
                      {(form.name || '?').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-semibold text-white">{form.name || 'Telegram user'}</p>
                    <p className="text-xs text-lime">Synced from Telegram · confirm your birthday below</p>
                  </div>
                </div>
              )}
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                  Display name
                </span>
                <input
                  className="field"
                  placeholder="How should people know you?"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>

              <BirthDateFields
                value={form.birth_date}
                onChange={(birth_date) => setForm({ ...form, birth_date })}
              />

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">Gender</p>
                <div className="flex flex-wrap gap-2">
                  {['female', 'male', 'other'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`chip capitalize ${form.gender === g ? 'chip-active' : ''}`}
                      onClick={() => {
                        const datingPref = datingPreferredGender(g)
                        setForm({
                          ...form,
                          gender: g,
                          preferred_gender:
                            isCasualGoal(form.relationship_goal) && datingPref
                              ? datingPref
                              : form.preferred_gender,
                        })
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <CitySelect
                label="Your city"
                value={form.location}
                placeholder="Select your city"
                onChange={(city) => setForm({ ...form, location: city })}
              />
              <button
                type="button"
                className="w-full rounded-2xl border border-lime/30 bg-panel px-4 py-3 text-sm font-semibold text-lime"
                onClick={() => {
                  if (!navigator.geolocation) {
                    setError('Geolocation is not available on this device')
                    return
                  }
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setForm((prev) => ({
                        ...prev,
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                      }))
                      setError('')
                    },
                    () => setError('Could not get your location. You can continue with city only.'),
                  )
                }}
              >
                Use my current location
              </button>
              {form.latitude ? (
                <p className="text-xs text-lime">Location saved for distance matching</p>
              ) : null}
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                  Short bio
                </span>
                <textarea
                  className="field min-h-28"
                  placeholder="A little about you"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </label>
              <p className="pt-1 text-sm font-semibold">Relationship intention</p>
              <div className="flex flex-wrap gap-2">
                {RELATIONSHIP_GOALS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={`chip ${form.relationship_goal === g.id ? 'chip-active' : ''}`}
                    onClick={() => {
                      const datingPref = datingPreferredGender(form.gender)
                      setForm({
                        ...form,
                        relationship_goal: g.id,
                        preferred_gender:
                          isCasualGoal(g.id) && datingPref ? datingPref : form.preferred_gender,
                      })
                    }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn-lime mt-4 w-full py-3.5 disabled:opacity-40"
                disabled={!canContinueAbout || saving}
                onClick={continueAboutYou}
              >
                {saving ? 'Please wait…' : 'Continue'}
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                {photoFromTelegram
                  ? 'We imported your Telegram photo. Keep it or upload a better one.'
                  : 'Add your best photo — this is the first thing people see.'}
              </p>
              <label className="relative flex h-72 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[28px] border border-dashed border-white/15 bg-panel">
                {preview ? (
                  <>
                    <img src={preview} alt="Preview" className="absolute inset-0 h-full w-full object-cover" />
                    {photoFromTelegram && (
                      <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-lime backdrop-blur">
                        From Telegram
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-lime text-2xl text-ink">＋</span>
                    <span className="mt-3 text-sm text-muted">Upload photo</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void uploadPhoto(file)
                  }}
                />
              </label>
              <button
                type="button"
                className="w-full rounded-full border border-white/10 py-3.5 font-semibold text-white/70"
                disabled={saving}
                onClick={() => setStep(2)}
              >
                {saving ? 'Uploading…' : preview ? 'Looks good — continue' : 'Skip for now'}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted">Pick up to 8 interests.</p>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <button
                    key={interest.id}
                    type="button"
                    className={`chip ${form.interest_ids.includes(interest.id) ? 'chip-active' : ''}`}
                    onClick={() => toggleInterest(interest.id)}
                  >
                    {interest.name}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn-lime w-full py-3.5"
                disabled={form.interest_ids.length === 0}
                onClick={() => setStep(3)}
              >
                Continue
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold">Looking for</p>
              {isCasualGoal(form.relationship_goal) && datingPreferredGender(form.gender) ? (
                <>
                  <p className="text-sm text-muted">
                    For casual dating, we show you{' '}
                    <span className="font-semibold text-lime">
                      {datingPreferredGender(form.gender) === 'female' ? 'women' : 'men'}
                    </span>{' '}
                    only.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="chip chip-active">
                      {datingPreferredGender(form.gender) === 'female' ? 'Women' : 'Men'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'female', label: 'Women' },
                    { id: 'male', label: 'Men' },
                    { id: 'any', label: 'Everyone' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      className={`chip ${form.preferred_gender === g.id ? 'chip-active' : ''}`}
                      onClick={() => setForm({ ...form, preferred_gender: g.id })}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              )}

              <AgeRangeSlider
                minAge={form.min_age}
                maxAge={form.max_age}
                onChange={(min_age, max_age) => setForm({ ...form, min_age, max_age })}
              />

              <CitySelect
                label="Preferred city (optional)"
                value={form.preferred_location}
                allowAny
                anyLabel="Any city"
                placeholder="Filter matches by city"
                onChange={(city) => setForm({ ...form, preferred_location: city })}
              />
              <button type="button" className="btn-lime w-full py-3.5" onClick={() => setStep(4)}>
                Continue
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <ProfileExtrasFields
                form={{
                  height_cm: form.height_cm,
                  education: form.education,
                  occupation: form.occupation,
                  religion: form.religion,
                  languages: form.languages,
                  children: form.children,
                  pets: form.pets,
                  drinking: form.drinking,
                  smoking: form.smoking,
                  hobbies: form.hobbies,
                }}
                prompts={prompts}
                showPrompts={false}
                onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
                onPromptsChange={setPrompts}
              />
              <button type="button" className="btn-lime w-full py-3.5" onClick={() => setStep(5)}>
                Continue
              </button>
              <button
                type="button"
                className="w-full rounded-full border border-white/10 py-3.5 font-semibold text-white/70"
                onClick={() => setStep(5)}
              >
                Skip details
              </button>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <p className="text-xs text-muted">Optional — pick up to 3 prompts ({prompts.length}/3).</p>
              {PROFILE_PROMPTS.map((prompt) => {
                const active = prompts.some((p) => p.prompt_key === prompt.key)
                const answer = prompts.find((p) => p.prompt_key === prompt.key)?.answer || ''
                const lockedOut = !active && prompts.length >= 3
                return (
                  <div key={prompt.key} className={`rounded-2xl bg-panel p-3 ${lockedOut ? 'opacity-40' : ''}`}>
                    <button
                      type="button"
                      disabled={lockedOut}
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
                        maxLength={150}
                        placeholder="Your answer"
                        value={answer.trim() === '' ? '' : answer}
                        onChange={(e) => setPrompt(prompt.key, e.target.value)}
                      />
                    )}
                  </div>
                )
              })}
              <button
                type="button"
                className="btn-lime w-full py-3.5"
                disabled={saving}
                onClick={() => void saveProfile()}
              >
                {saving ? 'Saving…' : 'Start discovering'}
              </button>
              <button
                type="button"
                className="w-full rounded-full border border-white/10 py-3.5 font-semibold text-white/70"
                disabled={saving}
                onClick={() => void saveProfile()}
              >
                Skip prompts
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
