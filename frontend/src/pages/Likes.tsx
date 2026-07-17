import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { DiscoverCard } from '../types'
import { BottomNav } from '../components/BottomNav'
import { MatchModal } from '../components/MatchModal'
import { IconBack, IconLike } from '../components/Icons'
import { useNavBadges } from '../lib/navBadges'
import { telegramHaptic } from '../lib/telegram'
import { MediaImage } from '../components/MediaImage'

export function LikesPage() {
  const { user } = useAuth()
  const [likes, setLikes] = useState<DiscoverCard[]>([])
  const [loading, setLoading] = useState(true)
  const [matchUser, setMatchUser] = useState<DiscoverCard | null>(null)
  const [matchId, setMatchId] = useState<number | null>(null)
  const navigate = useNavigate()
  const { refreshBadges } = useNavBadges()

  useEffect(() => {
    api
      .likesReceived()
      .then((res) => {
        setLikes((res.data as DiscoverCard[]).filter((l) => !l.you_liked_back))
        void refreshBadges()
      })
      .catch(() => setLikes([]))
      .finally(() => setLoading(false))
  }, [refreshBadges])

  const likeBack = async (card: DiscoverCard) => {
    try {
      telegramHaptic('medium')
      // Likes page = they already liked you → show match UI immediately
      setLikes((prev) => prev.filter((l) => l.id !== card.id))
      setMatchUser(card)
      telegramHaptic('success')
      const res = await api.like(card.id)
      void refreshBadges()
      if (res.matched) {
        setMatchUser((res.other_user as DiscoverCard) || card)
        setMatchId(res.match?.id ?? null)
      } else {
        setMatchUser(null)
        setMatchId(null)
      }
    } catch {
      setMatchUser(null)
      setMatchId(null)
    }
  }

  return (
    <div className="app-shell">
      <header className="mb-5 flex items-center justify-between">
        <button type="button" className="grid h-9 w-9 place-items-center text-white/60" onClick={() => history.back()} aria-label="Back">
          <IconBack size={20} />
        </button>
        <h1 className="text-xl font-bold tracking-tight">Your Matches</h1>
        <span className="w-6" />
      </header>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : likes.length === 0 ? (
        <div className="rounded-[24px] bg-panel p-6 text-center">
          <p className="text-lg font-semibold">No likes yet</p>
          <p className="mt-2 text-sm text-muted">When someone likes you, they’ll show up here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {likes.map((card) => (
            <button
              key={card.id}
              type="button"
              className="relative overflow-hidden rounded-[22px] bg-panel text-left"
              onClick={() => void likeBack(card)}
            >
              <MediaImage
                src={card.photo_url}
                fallbacks={card.photos?.map((p) => p.image_url)}
                alt={card.name}
                className="aspect-[3/4] w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-heart">
                <IconLike size={10} /> {card.compatibility_score ?? 95}%
              </span>
              <div className="absolute inset-x-0 bottom-0 p-3">
                {card.location && <p className="text-[11px] text-white/70">{card.location}</p>}
                <p className="font-semibold">
                  {card.name}
                  {card.age ? `, ${card.age}` : ''}
                </p>
              </div>
            </button>
          ))}
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
      <BottomNav />
    </div>
  )
}
