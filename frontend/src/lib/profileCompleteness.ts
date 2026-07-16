/** Shared checklist for profile completion progress (0–100). */
export type ProfileCompletenessUser = {
  photo_url?: string | null
  photos?: { id: number }[] | null
  interests?: { id: number }[] | null
  prompts?: { prompt_key: string; answer?: string }[] | null
  preferences?: {
    preferred_gender?: string | null
    min_age?: number | null
    max_age?: number | null
  } | null
  profile?: {
    name?: string | null
    birth_date?: string | null
    gender?: string | null
    location?: string | null
    bio?: string | null
    relationship_goal?: string | null
    height_cm?: number | null
    education?: string | null
    occupation?: string | null
    religion?: string | null
    languages?: string[] | null
    children?: string | null
    pets?: string | null
    drinking?: string | null
    smoking?: string | null
    hobbies?: string[] | null
  } | null
}

const MAX_PHOTOS = 6

function photoCount(u: ProfileCompletenessUser) {
  const uploaded = u.photos?.length ?? 0
  if (uploaded > 0) return uploaded
  return u.photo_url ? 1 : 0
}

const CHECKS: { key: string; label: string; done: (u: ProfileCompletenessUser) => boolean }[] = [
  {
    key: 'photo_1',
    label: 'Add your first photo',
    done: (u) => photoCount(u) >= 1,
  },
  {
    key: 'photo_3',
    label: 'Upload 3 photos',
    done: (u) => photoCount(u) >= 3,
  },
  {
    key: 'photo_6',
    label: `Fill your gallery (${MAX_PHOTOS} photos)`,
    done: (u) => photoCount(u) >= MAX_PHOTOS,
  },
  {
    key: 'about',
    label: 'Name, birthday & gender',
    done: (u) =>
      Boolean(u.profile?.name?.trim()) &&
      Boolean(u.profile?.birth_date) &&
      (u.profile?.gender === 'male' || u.profile?.gender === 'female'),
  },
  {
    key: 'location',
    label: 'City',
    done: (u) => Boolean(u.profile?.location?.trim()),
  },
  {
    key: 'bio',
    label: 'Bio',
    done: (u) => Boolean(u.profile?.bio?.trim()),
  },
  {
    key: 'goal',
    label: 'Relationship intention',
    done: (u) => Boolean(u.profile?.relationship_goal),
  },
  {
    key: 'interests',
    label: 'Interests',
    done: (u) => (u.interests?.length ?? 0) > 0,
  },
  {
    key: 'prefs',
    label: 'Who you want to meet',
    done: (u) => Boolean(u.preferences?.preferred_gender),
  },
  {
    key: 'details',
    label: 'Lifestyle details',
    done: (u) => {
      const p = u.profile
      if (!p) return false
      return Boolean(
        p.height_cm ||
          p.education?.trim() ||
          p.occupation?.trim() ||
          p.religion?.trim() ||
          (p.languages?.length ?? 0) > 0 ||
          p.children ||
          p.pets ||
          p.drinking ||
          p.smoking ||
          (p.hobbies?.length ?? 0) > 0,
      )
    },
  },
  {
    key: 'prompts',
    label: 'Profile prompts',
    done: (u) => (u.prompts?.filter((p) => p.answer?.trim()).length ?? 0) > 0,
  },
]

export function profileCompleteness(user: ProfileCompletenessUser | null | undefined) {
  if (!user) {
    return {
      percent: 0,
      completed: 0,
      total: CHECKS.length,
      photoCount: 0,
      missing: CHECKS.map((c) => c.label),
      items: [],
    }
  }

  const items = CHECKS.map((c) => ({ key: c.key, label: c.label, done: c.done(user) }))
  const completed = items.filter((i) => i.done).length
  const total = items.length
  const percent = Math.round((completed / total) * 100)
  const missing = items.filter((i) => !i.done).map((i) => i.label)

  return { percent, completed, total, photoCount: photoCount(user), missing, items }
}

export function isProfileFullyComplete(user: ProfileCompletenessUser | null | undefined) {
  return profileCompleteness(user).percent >= 100
}
