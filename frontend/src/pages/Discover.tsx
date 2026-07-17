import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { DiscoverCard, Interest } from '../types'
import { ProfileCard } from '../components/ProfileCard'
import { MatchModal } from '../components/MatchModal'
import { ReportSheet } from '../components/ReportSheet'
import { FiltersSheet, type FilterState } from '../components/FiltersSheet'
import { BottomNav } from '../components/BottomNav'
import { IconFilters } from '../components/Icons'
import { telegramHaptic } from '../lib/telegram'
import { resolveMediaUrl } from '../lib/media'

type Tab = 'all' | 'online' | 'location'

export function DiscoverPage() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const [cards, setCards] = useState<DiscoverCard[]>([])
  /** Successful left-swipes available to undo (most recent last). */
  const [passStack, setPassStack] = useState<DiscoverCard[]>([])
  const [serverCanRewind, setServerCanRewind] = useState(false)
  const [tab, setTab] = useState<Tab>('all')
  const [loading, setLoading] = useState(true)
  const [matchUser, setMatchUser] = useState<DiscoverCard | null>(null)
  const [matchId, setMatchId] = useState<number | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [error, setError] = useState('')
  const [rewinding, setRewinding] = useState(false)
  const [filterInterests, setFilterInterests] = useState<Interest[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.discover()
      setCards(res.data as DiscoverCard[])
      setServerCanRewind(Boolean(res.can_rewind))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    api.interests().then((res) => setFilterInterests(res.interests)).catch(() => undefined)
  }, [])

  const cityFilter =
    user?.preferences?.preferred_location?.trim() || user?.profile?.location?.trim() || ''

  const filtered = useMemo(() => {
    if (tab === 'location') {
      if (!cityFilter) return cards
      return cards.filter((c) => (c.location || '').toLowerCase() === cityFilter.toLowerCase())
    }
    if (tab === 'online') {
      return cards.filter((c) => c.is_online)
    }
    return cards
  }, [cards, tab, cityFilter])

  const current = filtered[0]
  const canRewind = (passStack.length > 0 || serverCanRewind) && !rewinding

  const removeFromDeck = (cardId: number) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId))
  }

  const react = async (type: 'like' | 'super') => {
    if (!current) return
    const liked = current
    telegramHaptic(type === 'super' ? 'heavy' : 'medium')
    removeFromDeck(liked.id)
    try {
      const res = await api.like(liked.id, type)
      if (res.matched) {
        telegramHaptic('success')
        setMatchUser((res.other_user as DiscoverCard) || liked)
        setMatchId(res.match?.id ?? null)
      }
    } catch {
      setCards((prev) => [liked, ...prev.filter((c) => c.id !== liked.id)])
    }
  }

  const onPass = async () => {
    if (!current) return
    const passed = current
    telegramHaptic('light')
    removeFromDeck(passed.id)
    try {
      const res = await api.pass(passed.id)
      setPassStack((prev) => [...prev, passed])
      setServerCanRewind(res.can_rewind !== false)
    } catch {
      setCards((prev) => [passed, ...prev.filter((c) => c.id !== passed.id)])
      setError('Could not pass — try again')
    }
  }

  const onRewind = async () => {
    if (!canRewind) return
    setRewinding(true)
    setError('')
    try {
      const res = await api.rewind()
      const restored =
        (res.user as DiscoverCard | null | undefined) ||
        passStack[passStack.length - 1] ||
        null

      setPassStack((prev) => prev.slice(0, -1))
      setServerCanRewind(Boolean(res.can_rewind))

      if (restored) {
        setCards((prev) => {
          const without = prev.filter((c) => c.id !== restored.id)
          return [restored, ...without]
        })
        setTab('all')
        telegramHaptic('success')
      }
    } catch (e) {
      setServerCanRewind(false)
      setPassStack([])
      setError(e instanceof Error ? e.message : 'No left swipe to undo')
    } finally {
      setRewinding(false)
    }
  }

  const onReportSubmit = async (reason: string, block: boolean) => {
    if (!current) return
    const target = current
    setReportOpen(false)
    removeFromDeck(target.id)
    try {
      await api.report(target.id, reason)
      if (block) await api.block(target.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Report failed')
      setCards((prev) => [target, ...prev.filter((c) => c.id !== target.id)])
    }
  }

  const saveFilters = async (filters: FilterState) => {
    setFiltersOpen(false)
    const gender = user?.profile?.gender
    if (gender !== 'male' && gender !== 'female') {
      setError('Set your gender in Profile before updating filters.')
      return
    }
    try {
      await api.saveProfile({
        name: user?.profile?.name || user?.first_name || 'User',
        birth_date: user?.profile?.birth_date?.slice(0, 10),
        gender,
        location: user?.profile?.location,
        latitude: user?.profile?.latitude,
        longitude: user?.profile?.longitude,
        bio: user?.profile?.bio,
        relationship_goal: filters.relationship_goal || user?.profile?.relationship_goal,
        interest_ids: user?.interests?.map((i) => i.id) || [],
        preferred_gender: filters.preferred_gender,
        min_age: filters.min_age,
        max_age: filters.max_age,
        preferred_location: filters.preferred_location || null,
        max_distance_km: filters.max_distance_km,
        preferred_languages: filters.preferred_languages || [],
        preferred_interest_ids: filters.preferred_interest_ids || [],
      })
      await refresh()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save filters')
    }
  }

  return (
    <div className="discover-shell">
      <header className="discover-shell-header">
        <div className="discover-tabs">
          {(
            [
              ['all', 'All'],
              ['online', 'Online'],
              ['location', 'Nearby'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`discover-tab${tab === id ? ' is-active' : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="discover-filter-btn"
          aria-label="Filters"
        >
          <IconFilters size={18} />
        </button>
      </header>

      {error ? <p className="mb-2 shrink-0 text-sm text-red-300">{error}</p> : null}

      <div className="discover-shell-stage">
        {loading ? (
          <div className="discover-card grid place-items-center text-muted">Loading profiles…</div>
        ) : current ? (
          <div className="discover-card-wrap">
            {filtered[1] && (
              <motion.div
                key={`next-${filtered[1].id}`}
                className="discover-card discover-card-next pointer-events-none z-0 will-change-transform [transform:translateZ(0)]"
                initial={false}
                animate={{ scale: 0.965, opacity: 0.85, y: 10 }}
                transition={{ type: 'tween', duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <img
                  src={resolveMediaUrl(
                    filtered[1].photos?.[0]?.image_url || filtered[1].photo_url,
                    'https://i.pravatar.cc/800?u=next',
                  )}
                  alt=""
                  className="h-full w-full object-cover"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-black/25" />
              </motion.div>
            )}
            <div className="relative z-10 h-full min-h-0">
              {/* No AnimatePresence here: mode=sync stacked two full-height cards and broke the layout when swiping a multi-card deck. Exit is handled by ProfileCard flyOut before state updates. */}
              <ProfileCard
                key={current.id}
                card={current}
                onLike={() => void react('like')}
                onSuperLike={() => void react('super')}
                onPass={() => void onPass()}
                onRewind={() => void onRewind()}
                canRewind={canRewind}
                onReport={() => setReportOpen(true)}
              />
            </div>
          </div>
        ) : (
          <div className="discover-card grid place-items-center px-6 text-center">
            <div>
              <p className="text-xl font-bold">No more profiles</p>
              <p className="mt-2 text-sm text-muted">
                {canRewind
                  ? 'Rewind your last left swipe, or refresh for new people.'
                  : 'Check back later or adjust your filters.'}
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  type="button"
                  className="rounded-full border border-amber-300/40 px-5 py-3 text-sm font-semibold text-amber-300 disabled:opacity-40"
                  disabled={!canRewind}
                  onClick={() => void onRewind()}
                >
                  {rewinding ? 'Rewinding…' : 'Rewind'}
                </button>
                <button type="button" className="btn-lime px-5 py-3" onClick={() => void load()}>
                  Refresh
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <MatchModal
        open={!!matchUser}
        matchUser={matchUser}
        myName={user?.profile?.name || user?.first_name || 'You'}
        myPhoto={
          user?.photos?.find((p) => p.is_primary)?.image_url ||
          user?.photos?.[0]?.image_url ||
          user?.photo_url
        }
        onContinue={() => {
          setMatchUser(null)
          setMatchId(null)
        }}
        onChat={(initialMessage) => {
          if (matchId) {
            navigate(`/chat/${matchId}`, initialMessage ? { state: { initialMessage } } : undefined)
          } else {
            navigate('/messages')
          }
          setMatchUser(null)
        }}
      />

      <ReportSheet
        open={reportOpen}
        name={current?.name}
        onClose={() => setReportOpen(false)}
        onSubmit={(reason, block) => void onReportSubmit(reason, block)}
      />

      <FiltersSheet
        open={filtersOpen}
        userGender={
          user?.profile?.gender === 'male' || user?.profile?.gender === 'female'
            ? user.profile.gender
            : 'female'
        }
        interests={filterInterests}
        initial={{
          preferred_gender: user?.preferences?.preferred_gender || 'any',
          min_age: Math.max(18, user?.preferences?.min_age || 18),
          max_age: Math.max(18, user?.preferences?.max_age || 40),
          preferred_location: user?.preferences?.preferred_location || '',
          relationship_goal: user?.profile?.relationship_goal || 'casual',
          max_distance_km: user?.preferences?.max_distance_km || 50,
          preferred_languages: user?.preferences?.preferred_languages || [],
          preferred_interest_ids: user?.preferences?.preferred_interest_ids || [],
        }}
        onClose={() => setFiltersOpen(false)}
        onSave={(f) => void saveFilters(f)}
      />

      <BottomNav />
    </div>
  )
}
