import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { MatchItem } from '../types'
import { BottomNav } from '../components/BottomNav'
import { IconLike } from '../components/Icons'
import { resolveMediaUrl } from '../lib/media'

export function MatchesPage() {
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .matches()
      .then((res) => setMatches(res.data as MatchItem[]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="app-shell">
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime">Connections</p>
        <h1 className="text-2xl font-bold tracking-tight">Your Matches</h1>
      </header>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : matches.length === 0 ? (
        <div className="rounded-[24px] bg-panel p-6 text-center">
          <p className="text-lg font-semibold">No matches yet</p>
          <p className="mt-2 text-sm text-muted">Keep swiping — the right person is out there.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {matches.map((match) => (
            <button
              key={match.id}
              type="button"
              className="relative overflow-hidden rounded-[22px] bg-panel text-left"
              onClick={() => {
                if (match.telegram_chat_url) window.open(match.telegram_chat_url, '_blank')
                else if (match.user.username) window.open(`https://t.me/${match.user.username}`, '_blank')
              }}
            >
              <img
                src={resolveMediaUrl(match.user.photo_url, 'https://i.pravatar.cc/400')}
                alt={match.user.name}
                className="aspect-[3/4] w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              {typeof match.user.compatibility_score === 'number' && (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-heart">
                  <IconLike size={10} /> {match.user.compatibility_score}%
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-3">
                {match.user.location && <p className="text-[11px] text-white/70">{match.user.location}</p>}
                <p className="font-semibold">
                  {match.user.name}
                  {match.user.age ? `, ${match.user.age}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
      <BottomNav />
    </div>
  )
}
