import { useMemo, useState } from 'react'
import imageCompression from 'browser-image-compression'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { getTelegramUserUnsafe, telegramHaptic } from '../lib/telegram'
import { CitySelect } from '../components/CitySelect'
import { BirthDateFields, isAtLeast18 } from '../components/BirthDateFields'
import { datingPreferredGender } from '../components/AgeRangeSlider'
import { MediaImage } from '../components/MediaImage'
import { RELATIONSHIP_GOALS, isCasualGoal } from '../lib/profileOptions'

const steps = ['About you', 'Photos']

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
  if (primary?.image_url) return primary.image_url
  if (user?.photo_url) return user.photo_url
  return getTelegramUserUnsafe()?.photo_url || null
}

export function OnboardingPage() {
  const { refresh, user, logout } = useAuth()
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const syncedPhoto = telegramPhotoUrl(user)
  const [preview, setPreview] = useState<string | null>(syncedPhoto)
  const [photoFromTelegram] = useState(Boolean(syncedPhoto))
  const [form, setForm] = useState({
    name: telegramDisplayName(user),
    birth_date: user?.profile?.birth_date?.slice(0, 10) || '',
    gender: (user?.profile?.gender === 'male' || user?.profile?.gender === 'female'
      ? user.profile.gender
      : '') as '' | 'male' | 'female',
    location: user?.profile?.location || 'Addis Ababa',
    latitude: (user?.profile?.latitude as number | null | undefined) ?? null,
    longitude: (user?.profile?.longitude as number | null | undefined) ?? null,
    bio: user?.profile?.bio || '',
    relationship_goal: user?.profile?.relationship_goal || 'casual',
  })

  const title = useMemo(() => steps[step], [step])
  const canContinueAbout =
    Boolean(form.name.trim()) &&
    Boolean(form.birth_date) &&
    isAtLeast18(form.birth_date) &&
    (form.gender === 'male' || form.gender === 'female')

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
    if (form.gender !== 'male' && form.gender !== 'female') {
      setError('Please select your gender.')
      return
    }
    setStep(1)
  }

  const finishOnboarding = async () => {
    if (!isAtLeast18(form.birth_date)) {
      void rejectUnderage()
      return
    }
    if (form.gender !== 'male' && form.gender !== 'female') {
      setError('Please select your gender.')
      setStep(0)
      return
    }

    const datingPref = datingPreferredGender(form.gender)
    const preferred_gender =
      isCasualGoal(form.relationship_goal) && datingPref ? datingPref : datingPref || 'any'

    setSaving(true)
    setError('')
    try {
      await api.saveProfile({
        name: form.name,
        birth_date: form.birth_date,
        gender: form.gender,
        location: form.location,
        latitude: form.latitude,
        longitude: form.longitude,
        bio: form.bio,
        relationship_goal: form.relationship_goal,
        preferred_gender,
        min_age: 18,
        max_age: 35,
      })
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
      setSaving(false)
      await finishOnboarding()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
      setSaving(false)
    }
  }

  return (
    <div className="app-shell">
      <div className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-lime">Onboarding</div>
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-full bg-panel text-white/70"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || saving}
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
              <p className="mb-2 text-sm text-muted">Tell people who you are. You can add more details later.</p>
              {(form.name || syncedPhoto) && (
                <div className="mb-1 flex items-center gap-3 rounded-[22px] border border-lime/20 bg-panel px-3 py-3">
                  {syncedPhoto ? (
                    <MediaImage
                      src={syncedPhoto}
                      fallbacks={[user?.photo_url, getTelegramUserUnsafe()?.photo_url]}
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
                  {(['female', 'male'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`chip capitalize ${form.gender === g ? 'chip-active' : ''}`}
                      onClick={() => setForm({ ...form, gender: g })}
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
                    onClick={() => setForm({ ...form, relationship_goal: g.id })}
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
                Continue
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
                  disabled={saving}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void uploadPhoto(file)
                  }}
                />
              </label>
              <button
                type="button"
                className="btn-lime w-full py-3.5 disabled:opacity-40"
                disabled={saving}
                onClick={() => void finishOnboarding()}
              >
                {saving ? 'Saving…' : preview ? 'Looks good — start discovering' : 'Skip photo for now'}
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
