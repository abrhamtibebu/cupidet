import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
  const [history, setHistory] = useState<DiscoverCard[]>([])
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
  const canRewind = history.length > 0 && !rewinding
  const deckCount = filtered.length

  const advance = (card: DiscoverCard) => {
    setHistory((prev) => [...prev, card])
    setCards((prev) => prev.filter((c) => c.id !== card.id))
  }

  const react = async (type: 'like' | 'super') => {
    if (!current) return
    const liked = current
    telegramHaptic(type === 'super' ? 'heavy' : 'medium')
    advance(liked)
    try {
      const res = await api.like(liked.id, type)
      if (res.matched) {
        telegramHaptic('success')
        setHistory((prev) => prev.filter((c) => c.id !== liked.id))
        setMatchUser((res.other_user as DiscoverCard) || liked)
        setMatchId(res.match?.id ?? null)
      }
    } catch {
      /* keep browsing */
    }
  }

  const onPass = async () => {
    if (!current) return
    const passed = current
    telegramHaptic('light')
    advance(passed)
    try {
      await api.pass(passed.id)
    } catch {
      setHistory((prev) => prev.filter((c) => c.id !== passed.id))
      setCards((prev) => [passed, ...prev.filter((c) => c.id !== passed.id)])
    }
  }

  const onRewind = async () => {
    if (!canRewind) return
    setRewinding(true)
    setError('')
    const localCard = history[history.length - 1]
    try {
      const res = await api.rewind()
      const restored = (res.user as DiscoverCard | null | undefined) || localCard
      setHistory((prev) => prev.slice(0, -1))
      setCards((prev) => {
        const without = prev.filter((c) => c.id !== restored.id)
        return [restored, ...without]
      })
      setTab('all')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nothing to rewind')
    } finally {
      setRewinding(false)
    }
  }

  const onReportSubmit = async (reason: string, block: boolean) => {
    if (!current) return
    const target = current
    setReportOpen(false)
    advance(target)
    try {
      await api.report(target.id, reason)
      if (block) await api.block(target.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Report failed')
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
    <div className="app-shell relative overflow-hidden">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(223,252,1,0.18),transparent_62%)]" />

      <header className="relative z-10 mb-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-lime">Discover</p>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.06em] text-white">Meet someone real</h1>
            <p className="mt-1 text-sm text-muted">
              {deckCount > 0 ? `${deckCount} profiles waiting` : 'Fresh matches from the Habesha community'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-panel/90 text-lime shadow-xl"
            aria-label="Filters"
          >
            <IconFilters size={21} />
          </button>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto rounded-[22px] border border-white/8 bg-panel/80 p-1 shadow-lg backdrop-blur [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(
            [
              ['all', 'All'],
              ['online', 'Online'],
              ['location', cityFilter ? cityFilter.split(' ')[0] : 'Near me'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`shrink-0 rounded-[18px] px-4 py-2 text-sm font-bold transition ${
                tab === id ? 'bg-lime text-ink shadow-lg shadow-lime/10' : 'text-white/55'
              }`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {error && <p className="mb-3 text-sm text-red-300">{error}</p>}

      {loading ? (
        <div className="grid h-[68dvh] min-h-[560px] place-items-center rounded-[34px] border border-white/10 bg-panel/80 text-center shadow-2xl">
          <div>
            <div className="mx-auto mb-4 h-16 w-16 animate-pulse rounded-full bg-lime/25" />
            <p className="text-lg font-bold text-white">Finding profiles…</p>
            <p className="mt-1 text-sm text-muted">Tuning your deck for better matches.</p>
          </div>
        </div>
      ) : current ? (
        <div className="relative">
          {filtered[2] && (
            <motion.div
              key={`third-${filtered[2].id}`}
              className="pointer-events-none absolute inset-x-5 top-6 z-0 h-[68dvh] min-h-[560px] overflow-hidden rounded-[34px] border border-white/6 bg-panel will-change-transform [transform:translateZ(0)]"
              initial={false}
              animate={{ scale: 0.92, opacity: 0.35, y: 22 }}
              transition={{ type: 'tween', duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="h-full w-full bg-gradient-to-br from-panel to-panel-2" />
            </motion.div>
          )}
          {filtered[1] && (
            <motion.div
              key={`next-${filtered[1].id}`}
              className="pointer-events-none absolute inset-x-3 top-3 z-0 h-[68dvh] min-h-[560px] overflow-hidden rounded-[34px] border border-white/8 will-change-transform [transform:translateZ(0)]"
              initial={false}
              animate={{ scale: 0.95, opacity: 0.68, y: 12 }}
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
              <div className="absolute inset-0 bg-black/42" />
            </motion.div>
          )}
          <AnimatePresence mode="sync" initial={false}>
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
          </AnimatePresence>
        </div>
      ) : (
        <div className="grid h-[68dvh] min-h-[560px] place-items-center rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(223,252,1,0.12),transparent_45%),#121212] px-6 text-center shadow-2xl">
          <div>
            <p className="text-3xl font-black tracking-[-0.05em]">You’re all caught up</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">Try a wider age range, another city, or check back when more people join.</p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
                disabled={!canRewind}
                onClick={() => void onRewind()}
              >
                Rewind
              </button>
              <button type="button" className="btn-lime px-5 py-3" onClick={() => void load()}>
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}

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
