import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import imageCompression from 'browser-image-compression'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { resolveMediaUrl } from '../lib/media'
import { telegramHaptic } from '../lib/telegram'
import { BottomNav } from '../components/BottomNav'
import { IconSettings } from '../components/Icons'
import { CitySelect } from '../components/CitySelect'
import { LoadingButton, Spinner } from '../components/Loading'
import { AgeRangeSlider, datingPreferredGender } from '../components/AgeRangeSlider'
import {
  ProfileExtrasFields,
  parseHobbies,
} from '../components/ProfileExtrasFields'
import {
  RELATIONSHIP_GOALS,
  goalLabel as formatGoal,
  isCasualGoal,
  optionLabel,
  CHILDREN_OPTIONS,
  PETS_OPTIONS,
  DRINKING_OPTIONS,
  SMOKING_OPTIONS,
} from '../lib/profileOptions'
import { profileCompleteness } from '../lib/profileCompleteness'
import type { Interest, Photo, ProfilePrompt } from '../types'

function photoSrc(photo?: Photo | null, fallback?: string | null) {
  return resolveMediaUrl(photo?.image_url || fallback, 'https://i.pravatar.cc/800?u=me')
}

function ageFromBirthDate(iso?: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const before =
    today.getMonth() < d.getMonth() ||
    (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())
  if (before) age -= 1
  return age
}

export function ProfilePage() {
  const { user, refresh } = useAuth()
  const [editing, setEditing] = useState(false)
  const [interests, setInterests] = useState<Interest[]>([])
  const [interestsLoading, setInterestsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [submittingVerification, setSubmittingVerification] = useState(false)
  const [busyPhotoId, setBusyPhotoId] = useState<number | null>(null)
  const [photoAction, setPhotoAction] = useState<'primary' | 'delete' | null>(null)
  const [prompts, setPrompts] = useState<ProfilePrompt[]>(user?.prompts || [])
  const [form, setForm] = useState({
    name: user?.profile?.name || '',
    birth_date: user?.profile?.birth_date || '',
    gender: user?.profile?.gender === 'male' || user?.profile?.gender === 'female' ? user.profile.gender : '',
    location: user?.profile?.location || '',
    bio: user?.profile?.bio || '',
    relationship_goal: user?.profile?.relationship_goal || 'casual',
    interest_ids: user?.interests?.map((i) => i.id) || [],
    preferred_gender: user?.preferences?.preferred_gender || 'any',
    min_age: Math.max(18, user?.preferences?.min_age || 18),
    max_age: Math.max(18, user?.preferences?.max_age || 40),
    preferred_location: user?.preferences?.preferred_location || '',
    height_cm: user?.profile?.height_cm ? String(user.profile.height_cm) : '',
    education: user?.profile?.education || '',
    occupation: user?.profile?.occupation || '',
    religion: user?.profile?.religion || '',
    languages: user?.profile?.languages || [],
    children: user?.profile?.children || '',
    pets: user?.profile?.pets || '',
    drinking: user?.profile?.drinking || '',
    smoking: user?.profile?.smoking || '',
    hobbies: (user?.profile?.hobbies || []).join(', '),
  })

  useEffect(() => {
    setInterestsLoading(true)
    api
      .interests()
      .then((res) => setInterests(res.interests))
      .catch(() => undefined)
      .finally(() => setInterestsLoading(false))
  }, [])

  useEffect(() => {
    if (!user) return
    setPrompts(user.prompts || [])
    setForm({
      name: user.profile?.name || '',
      birth_date: user.profile?.birth_date || '',
      gender: user.profile?.gender === 'male' || user.profile?.gender === 'female' ? user.profile.gender : '',
      location: user.profile?.location || '',
      bio: user.profile?.bio || '',
      relationship_goal: user.profile?.relationship_goal || 'casual',
      interest_ids: user.interests?.map((i) => i.id) || [],
      preferred_gender: user.preferences?.preferred_gender || 'any',
      min_age: Math.max(18, user.preferences?.min_age || 18),
      max_age: Math.max(18, user.preferences?.max_age || 40),
      preferred_location: user.preferences?.preferred_location || '',
      height_cm: user.profile?.height_cm ? String(user.profile.height_cm) : '',
      education: user.profile?.education || '',
      occupation: user.profile?.occupation || '',
      religion: user.profile?.religion || '',
      languages: user.profile?.languages || [],
      children: user.profile?.children || '',
      pets: user.profile?.pets || '',
      drinking: user.profile?.drinking || '',
      smoking: user.profile?.smoking || '',
      hobbies: (user.profile?.hobbies || []).join(', '),
    })
  }, [user])

  const photos = user?.photos || []
  const primary = photos.find((p) => p.is_primary) || photos[0]
  const age = ageFromBirthDate(user?.profile?.birth_date)
  const goalLabel = formatGoal(user?.profile?.relationship_goal)
  const lookingFor = useMemo(() => {
    const g = user?.preferences?.preferred_gender
    if (g === 'female') return 'Women'
    if (g === 'male') return 'Men'
    return 'Everyone'
  }, [user?.preferences?.preferred_gender])

  const anyBusy = saving || uploading || submittingVerification || busyPhotoId !== null
  const completeness = useMemo(() => profileCompleteness(user), [user])
  const verification = user?.verification_request

  const detailFacts = useMemo(() => {
    const p = user?.profile
    if (!p) return []
    return [
      p.occupation,
      p.height_cm ? `${p.height_cm} cm` : null,
      p.education,
      p.religion,
      ...(p.languages || []),
      optionLabel(CHILDREN_OPTIONS, p.children),
      optionLabel(PETS_OPTIONS, p.pets),
      p.drinking ? `Drinks: ${optionLabel(DRINKING_OPTIONS, p.drinking)}` : null,
      p.smoking ? `Smokes: ${optionLabel(SMOKING_OPTIONS, p.smoking)}` : null,
      ...(p.hobbies || []),
    ].filter(Boolean) as string[]
  }, [user?.profile])

  const resetFormFromUser = () => {
    if (!user) return
    setPrompts(user.prompts || [])
    setForm({
      name: user.profile?.name || '',
      birth_date: user.profile?.birth_date || '',
      gender: user.profile?.gender === 'male' || user.profile?.gender === 'female' ? user.profile.gender : '',
      location: user.profile?.location || '',
      bio: user.profile?.bio || '',
      relationship_goal: user.profile?.relationship_goal || 'casual',
      interest_ids: user.interests?.map((i) => i.id) || [],
      preferred_gender: user.preferences?.preferred_gender || 'any',
      min_age: Math.max(18, user.preferences?.min_age || 18),
      max_age: Math.max(18, user.preferences?.max_age || 40),
      preferred_location: user.preferences?.preferred_location || '',
      height_cm: user.profile?.height_cm ? String(user.profile.height_cm) : '',
      education: user.profile?.education || '',
      occupation: user.profile?.occupation || '',
      religion: user.profile?.religion || '',
      languages: user.profile?.languages || [],
      children: user.profile?.children || '',
      pets: user.profile?.pets || '',
      drinking: user.profile?.drinking || '',
      smoking: user.profile?.smoking || '',
      hobbies: (user.profile?.hobbies || []).join(', '),
    })
  }

  const cancelEdit = () => {
    resetFormFromUser()
    setEditing(false)
    setMessage('')
    setError('')
  }

  const save = async () => {
    setError('')
    setMessage('')
    if (form.gender !== 'male' && form.gender !== 'female') {
      setError('Please select your gender.')
      return
    }
    setSaving(true)
    try {
      const datingPref = datingPreferredGender(form.gender)
      const payload = {
        name: form.name,
        birth_date: form.birth_date,
        gender: form.gender,
        location: form.location,
        bio: form.bio,
        relationship_goal: form.relationship_goal,
        interest_ids: form.interest_ids,
        preferred_gender:
          isCasualGoal(form.relationship_goal) && datingPref ? datingPref : form.preferred_gender,
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
      await api.saveProfile(payload)
      telegramHaptic('success')
      await refresh()
      setEditing(false)
      setMessage('Profile saved')
    } catch (e) {
      telegramHaptic('error')
      setError(e instanceof Error ? e.message : 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  const upload = async (file: File, makePrimary = false) => {
    setUploading(true)
    setError('')
    setMessage('')
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1400,
        useWebWorker: true,
      })
      const isFirst = photos.length === 0
      await api.uploadPhoto(compressed, makePrimary || isFirst)
      telegramHaptic('success')
      await refresh()
      setMessage(makePrimary || isFirst ? 'Primary photo updated' : 'Photo added')
    } catch (e) {
      telegramHaptic('error')
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const submitVerificationSelfie = async (file: File) => {
    setSubmittingVerification(true)
    setError('')
    setMessage('')
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1400,
        useWebWorker: true,
      })
      const res = await api.uploadVerificationSelfie(compressed)
      telegramHaptic('success')
      await refresh()
      setMessage(res.message || 'Selfie submitted. Admin review usually takes 2 to 48 hours.')
    } catch (e) {
      telegramHaptic('error')
      setError(e instanceof Error ? e.message : 'Could not submit selfie')
    } finally {
      setSubmittingVerification(false)
    }
  }

  const setPrimary = async (photoId: number) => {
    setBusyPhotoId(photoId)
    setPhotoAction('primary')
    setError('')
    try {
      await api.setPrimaryPhoto(photoId)
      telegramHaptic('selection')
      await refresh()
      setMessage('Primary photo set')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not set primary photo')
    } finally {
      setBusyPhotoId(null)
      setPhotoAction(null)
    }
  }

  const removePhoto = async (photoId: number) => {
    if (!window.confirm('Delete this photo?')) return
    setBusyPhotoId(photoId)
    setPhotoAction('delete')
    setError('')
    try {
      await api.deletePhoto(photoId)
      telegramHaptic('success')
      await refresh()
      setMessage('Photo removed')
    } catch (e) {
      telegramHaptic('error')
      setError(e instanceof Error ? e.message : 'Could not delete photo')
    } finally {
      setBusyPhotoId(null)
      setPhotoAction(null)
    }
  }

  return (
    <div className="app-shell pb-28">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime">You</p>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/settings"
            className="grid h-10 w-10 place-items-center rounded-full bg-panel text-white/70"
            aria-label="Settings"
          >
            <IconSettings size={20} />
          </Link>
          {!editing && (
            <LoadingButton
              loading={false}
              disabled={anyBusy}
              onClick={() => {
                setEditing(true)
                setMessage('')
                setError('')
              }}
              className="rounded-full bg-lime px-4 py-2.5 text-sm font-bold text-ink"
            >
              Edit
            </LoadingButton>
          )}
        </div>
      </header>

      {(message || error) && (
        <div
          className={`mb-4 rounded-2xl px-3 py-2.5 text-sm ${
            error ? 'bg-red-500/15 text-red-300' : 'bg-lime/15 text-lime'
          }`}
        >
          {error || message}
        </div>
      )}

      {!editing && completeness.percent < 100 ? (
        <button
          type="button"
          onClick={() => {
            setEditing(true)
            setMessage('')
            setError('')
          }}
          className="mb-4 w-full rounded-[22px] border border-lime/25 bg-panel p-4 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Complete your profile</p>
              <p className="mt-1 text-xs text-muted">
                {completeness.photoCount < 6
                  ? `Photos ${completeness.photoCount}/6 · ${
                      completeness.missing[0] ? `Next: ${completeness.missing[0]}` : 'Keep going'
                    }`
                  : completeness.missing[0]
                    ? `Next: ${completeness.missing[0]}`
                    : 'Add a few more details to stand out.'}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-lime px-2.5 py-1 text-xs font-bold text-ink">
              {completeness.percent}%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-lime transition-[width] duration-300"
              style={{ width: `${completeness.percent}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-white/45">
            {completeness.completed}/{completeness.total} sections · tap to edit
          </p>
        </button>
      ) : null}

      {!user?.verified ? (
        <section className="mb-4 rounded-[22px] border border-sky-300/20 bg-panel p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Get verified</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Submit a quick selfie. Admin review usually takes 2 to 48 hours.
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                verification?.status === 'pending'
                  ? 'bg-amber-300/15 text-amber-200'
                  : verification?.status === 'rejected'
                    ? 'bg-red-500/15 text-red-300'
                    : 'bg-sky-300/15 text-sky-200'
              }`}
            >
              {verification?.status === 'pending'
                ? 'Reviewing'
                : verification?.status === 'rejected'
                  ? 'Try again'
                  : 'Selfie'}
            </span>
          </div>

          {verification?.status === 'pending' ? (
            <p className="mt-3 rounded-2xl bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
              Your selfie is pending admin approval. We’ll review it within 2 to 48 hours.
            </p>
          ) : verification?.status === 'rejected' ? (
            <p className="mt-3 rounded-2xl bg-red-500/10 px-3 py-2 text-xs text-red-200">
              Your last selfie was not approved{verification.notes ? `: ${verification.notes}` : '.'}
            </p>
          ) : null}

          <label
            className={`mt-3 flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-white/15 px-4 py-3 text-sm font-semibold ${
              submittingVerification || anyBusy ? 'pointer-events-none opacity-60' : 'text-sky-200'
            }`}
          >
            {submittingVerification
              ? 'Submitting selfie…'
              : verification?.status === 'pending'
                ? 'Replace selfie'
                : 'Submit selfie for review'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              className="hidden"
              disabled={submittingVerification || anyBusy}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void submitVerificationSelfie(file)
              }}
            />
          </label>
        </section>
      ) : (
        <section className="mb-4 rounded-[22px] border border-sky-300/25 bg-sky-300/10 px-4 py-3">
          <p className="text-sm font-semibold text-sky-100">Verified badge active</p>
          <p className="mt-1 text-xs text-sky-100/70">Your selfie was approved by admin.</p>
        </section>
      )}

      {/* Hero identity — full width (avoid aspect-ratio + max-height shrinking width) */}
      <section className="relative w-full min-w-0 overflow-hidden rounded-[28px]">
        <div className="relative h-[min(58dvh,520px)] w-full">
          <img
            src={photoSrc(primary, user?.photo_url)}
            alt={user?.profile?.name || 'You'}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-white">
                  {user?.profile?.name || user?.first_name}
                  {age ? <span className="font-semibold text-white/85">, {age}</span> : null}
                </h2>
                <p className="mt-1 text-sm text-white/70">
                  {[user?.profile?.location, goalLabel].filter(Boolean).join(' · ')}
                </p>
              </div>
              {user?.verified && (
                <span className="rounded-full bg-[#3b82f6] px-2.5 py-1 text-[10px] font-bold text-white">
                  Verified
                </span>
              )}
            </div>
            {user?.profile?.bio && (
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/80">{user.profile.bio}</p>
            )}
          </div>
        </div>
      </section>

      {/* Quick facts */}
      <section className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: 'Looking for', value: lookingFor },
          {
            label: 'Ages',
            value: `${user?.preferences?.min_age ?? 18}–${user?.preferences?.max_age ?? 40}`,
          },
          { label: 'Goal', value: goalLabel },
        ].map((item) => (
          <div key={item.label} className="rounded-[20px] bg-panel px-3 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{item.label}</p>
            <p className="mt-1 text-sm font-bold capitalize text-white">{item.value}</p>
          </div>
        ))}
      </section>

      {user?.interests && user.interests.length > 0 && (
        <section className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Interests</p>
          <div className="flex flex-wrap gap-2">
            {user.interests.map((i) => (
              <span key={i.id} className="rounded-full bg-panel px-3 py-1.5 text-xs font-semibold text-white/85">
                {i.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {detailFacts.length > 0 && (
        <section className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">About</p>
          <div className="flex flex-wrap gap-2">
            {detailFacts.map((fact) => (
              <span key={fact} className="rounded-full bg-panel px-3 py-1.5 text-xs font-semibold text-white/85">
                {fact}
              </span>
            ))}
          </div>
        </section>
      )}

      {user?.prompts && user.prompts.length > 0 && (
        <section className="mt-4 space-y-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Prompts</p>
          {user.prompts.map((p) => (
            <div key={p.prompt_key} className="rounded-[20px] bg-panel px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-lime/90">
                {p.label || p.prompt_key}
              </p>
              <p className="mt-1 text-sm text-white/90">{p.answer}</p>
            </div>
          ))}
        </section>
      )}

      {/* Photos */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Photos</h3>
          <span className="text-xs text-muted">{photos.length}/6</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => {
            const busy = busyPhotoId === photo.id
            return (
              <div key={photo.id} className="relative overflow-hidden rounded-[18px] bg-panel-2">
                <img
                  src={resolveMediaUrl(photo.image_url)}
                  alt=""
                  className={`aspect-square w-full object-cover transition ${busy ? 'opacity-40' : ''}`}
                />
                {busy && (
                  <div className="absolute inset-0 grid place-items-center bg-black/45">
                    <Spinner className="h-5 w-5 text-lime" label={photoAction === 'delete' ? 'Deleting' : 'Saving'} />
                  </div>
                )}
                {photo.is_primary && !busy && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-lime px-2 py-0.5 text-[10px] font-bold text-ink">
                    Main
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-black/85 to-transparent p-1.5">
                  {!photo.is_primary && (
                    <button
                      type="button"
                      disabled={anyBusy}
                      className="flex-1 rounded-lg bg-white/15 px-1 py-1.5 text-center text-[10px] font-semibold disabled:opacity-40"
                      onClick={() => void setPrimary(photo.id)}
                    >
                      {busy && photoAction === 'primary' ? '…' : 'Main'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={anyBusy}
                    className="rounded-lg bg-white/15 px-2 py-1.5 text-center text-[10px] font-semibold text-red-200 disabled:opacity-40"
                    onClick={() => void removePhoto(photo.id)}
                  >
                    {busy && photoAction === 'delete' ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            )
          })}

          {photos.length < 6 && (
            <label
              className={`relative grid aspect-square cursor-pointer place-items-center rounded-[18px] border border-dashed border-white/20 bg-panel text-center text-xs text-muted ${
                uploading || anyBusy ? 'pointer-events-none opacity-60' : ''
              }`}
            >
              {uploading ? (
                <Spinner className="h-5 w-5 text-lime" label="Uploading" />
              ) : (
                <>
                  <span className="text-2xl text-lime">＋</span>
                  Add
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploading || anyBusy}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) void upload(file, photos.length === 0)
                }}
              />
            </label>
          )}
        </div>
      </section>

      {/* Edit sheet */}
      {editing && (
        <section className="mt-6 space-y-4 rounded-[28px] border border-white/10 bg-panel p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-lime">Edit profile</p>
            <p className="mt-1 text-sm text-muted">Update how you appear in discovery.</p>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Name</span>
            <input
              className="field"
              value={form.name}
              disabled={saving}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Birthday</span>
            <input
              className="field"
              type="date"
              disabled={saving}
              value={form.birth_date?.slice(0, 10)}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
            />
          </label>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">Gender</p>
            <div className="flex flex-wrap gap-2">
              {(['female', 'male'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  disabled={saving}
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
            value={form.location || ''}
            placeholder="Select your city"
            onChange={(city) => setForm({ ...form, location: city })}
          />

          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Bio</span>
            <textarea
              className="field min-h-24"
              disabled={saving}
              value={form.bio || ''}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="A little about you"
            />
          </label>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">Goal</p>
            <div className="flex flex-wrap gap-2">
              {RELATIONSHIP_GOALS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  disabled={saving}
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
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">Looking for</p>
            {isCasualGoal(form.relationship_goal) && datingPreferredGender(form.gender) ? (
              <span className="chip chip-active">
                {datingPreferredGender(form.gender) === 'female' ? 'Women' : 'Men'}
              </span>
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
                    disabled={saving}
                    className={`chip ${form.preferred_gender === g.id ? 'chip-active' : ''}`}
                    onClick={() => setForm({ ...form, preferred_gender: g.id })}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <AgeRangeSlider
            minAge={form.min_age}
            maxAge={form.max_age}
            onChange={(min_age, max_age) => setForm({ ...form, min_age, max_age })}
          />

          <CitySelect
            label="Preferred city"
            value={form.preferred_location || ''}
            allowAny
            anyLabel="Any city"
            placeholder="Filter discovery by city"
            onChange={(city) => setForm({ ...form, preferred_location: city })}
          />

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">Interests</p>
            {interestsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Spinner className="h-4 w-4 text-lime" /> Loading interests…
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <button
                    key={interest.id}
                    type="button"
                    disabled={saving}
                    className={`chip ${form.interest_ids.includes(interest.id) ? 'chip-active' : ''}`}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        interest_ids: prev.interest_ids.includes(interest.id)
                          ? prev.interest_ids.filter((x) => x !== interest.id)
                          : [...prev.interest_ids, interest.id],
                      }))
                    }
                  >
                    {interest.name}
                  </button>
                ))}
              </div>
            )}
          </div>

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
            disabled={saving}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            onPromptsChange={setPrompts}
          />

          <div className="flex flex-col gap-2.5 pt-2">
            <LoadingButton
              loading={saving}
              loadingText="Saving profile…"
              className="btn-lime w-full py-3.5"
              onClick={() => void save()}
            >
              Save changes
            </LoadingButton>
            <button
              type="button"
              disabled={saving}
              onClick={cancelEdit}
              className="w-full rounded-full bg-white/10 px-4 py-3.5 text-center text-sm font-bold text-white disabled:opacity-55"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      <BottomNav />
    </div>
  )
}
