import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { getEcho } from '../lib/echo'
import { useNavBadges } from '../lib/navBadges'
import { pollMs } from '../lib/perf'
import type { ChatMessage, MatchItem } from '../types'
import { BottomNav } from '../components/BottomNav'
import { resolveMediaUrl } from '../lib/media'

function MessagesSkeleton() {
  return (
    <div className="space-y-1" aria-hidden>
      <div className="mb-5 flex gap-3 overflow-hidden pb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="shrink-0 text-center">
            <div className="skeleton mx-auto h-14 w-14 rounded-full" />
            <div className="skeleton mx-auto mt-2 h-2 w-10 rounded-full" />
          </div>
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl px-2 py-3">
          <div className="skeleton h-12 w-12 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="skeleton h-3 w-28 rounded-full" />
              <div className="skeleton h-2.5 w-10 rounded-full" />
            </div>
            <div className="skeleton h-2.5 w-[70%] rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MessagesPage() {
  const { user } = useAuth()
  const { refreshBadges } = useNavBadges()
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [typingByMatch, setTypingByMatch] = useState<Record<number, boolean>>({})
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(false)
  const navigate = useNavigate()
  const typingTimers = useRef<Record<number, number>>({})

  const applyServerTyping = (list: MatchItem[]) => {
    // Websocket-down fallback: server caches typing state for ~6s.
    setTypingByMatch((prev) => {
      const next = { ...prev }
      for (const m of list) {
        if (m.peer_typing) next[m.id] = true
        else if (next[m.id] && !m.peer_typing) next[m.id] = false
      }
      return next
    })
  }

  const load = () =>
    api
      .conversations()
      .then((res) => {
        const list = res.data as MatchItem[]
        setMatches(list)
        applyServerTyping(list)
        void refreshBadges()
      })
      .catch(() => api.matches().then((res) => setMatches(res.data as MatchItem[])))
      .finally(() => setLoading(false))

  useEffect(() => {
    void load()

    const echo = getEcho()
    const channels: string[] = []
    let poll = window.setInterval(() => void load(), pollMs(8000, 20000))

    const clearTypingTimer = (matchId: number) => {
      if (typingTimers.current[matchId]) {
        window.clearTimeout(typingTimers.current[matchId])
        delete typingTimers.current[matchId]
      }
    }

    const setTyping = (matchId: number, typing: boolean) => {
      clearTypingTimer(matchId)
      setTypingByMatch((prev) => {
        if (!!prev[matchId] === typing) return prev
        return { ...prev, [matchId]: typing }
      })
      if (typing) {
        typingTimers.current[matchId] = window.setTimeout(() => {
          setTypingByMatch((prev) => ({ ...prev, [matchId]: false }))
          delete typingTimers.current[matchId]
        }, 8000)
      }
    }

    const attach = async () => {
      try {
        const res = await api.conversations()
        const list = res.data as MatchItem[]
        setMatches(list)
        setLoading(false)
        void refreshBadges()
        if (!echo) return

        for (const match of list) {
          const name = `match.${match.id}`
          if (channels.includes(name)) continue
          channels.push(name)
          const channel = echo.private(name)

          channel.listen('.message.sent', (payload: { message: ChatMessage }) => {
            const msg = payload.message
            setTyping(match.id, false)
            if (msg.sender_id !== user?.id) {
              // Recipient is in the app (inbox) → mark delivered (double tick) before open/seen
              void api.markDelivered(match.id, [msg.id]).catch(() => undefined)
            }
            setMatches((prev) => {
              const next = prev.map((m) => {
                if (m.id !== match.id && m.id !== msg.match_id) return m
                const unread =
                  msg.sender_id !== user?.id ? (m.unread_count || 0) + 1 : m.unread_count || 0
                return {
                  ...m,
                  last_message: {
                    id: msg.id,
                    body: msg.body,
                    sender_id: msg.sender_id,
                    created_at: msg.created_at,
                    is_mine: msg.sender_id === user?.id,
                  },
                  unread_count: unread,
                }
              })
              return [...next].sort((a, b) => {
                const at = a.last_message?.created_at || a.matched_at
                const bt = b.last_message?.created_at || b.matched_at
                return new Date(bt).getTime() - new Date(at).getTime()
              })
            })
            setLive(true)
            void refreshBadges()
            window.clearInterval(poll)
            poll = window.setInterval(() => void load(), pollMs(20000, 45000))
          })

          channel.listen('.user.typing', (payload: { user_id: number; typing: boolean }) => {
            if (payload.user_id === user?.id) return
            setTyping(match.id, Boolean(payload.typing))
            setLive(true)
          })
        }
      } catch {
        /* keep polling */
      }
    }

    void attach()

    return () => {
      window.clearInterval(poll)
      Object.values(typingTimers.current).forEach((t) => window.clearTimeout(t))
      typingTimers.current = {}
      if (echo) {
        for (const name of channels) echo.leave(name)
      }
    }
  }, [user?.id, refreshBadges])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return matches
    return matches.filter((m) => m.user.name.toLowerCase().includes(q))
  }, [matches, query])

  return (
    <div className="app-shell">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Message</h1>
          <p className="text-xs text-muted">{loading ? 'Loading…' : live ? 'Live' : 'Updating…'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-panel text-lg">＋</span>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-panel">🔔</span>
        </div>
      </header>

      <div className="mb-4 flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
        <span className="text-muted">⌕</span>
        <input
          className="w-full bg-transparent outline-none"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
        />
      </div>

      {loading ? (
        <MessagesSkeleton />
      ) : filtered.length === 0 ? (
        <div className="rounded-[24px] bg-panel p-6 text-center">
          <p className="text-lg font-semibold">No messages yet</p>
          <p className="mt-2 text-sm text-muted">Match with someone, then start chatting here.</p>
        </div>
      ) : (
        <>
          {matches.length > 0 && (
            <div className="mb-5 flex gap-3 overflow-x-auto pb-1">
              {matches.slice(0, 10).map((match) => (
                <button
                  key={`story-${match.id}`}
                  type="button"
                  className="shrink-0 text-center"
                  onClick={() => navigate(`/chat/${match.id}`)}
                >
                  <div className="relative">
                    <img
                      src={resolveMediaUrl(match.user.photo_url, 'https://i.pravatar.cc/100')}
                      alt={match.user.name}
                      className="h-14 w-14 rounded-full object-cover ring-2 ring-lime/70"
                      loading="lazy"
                      decoding="async"
                    />
                    {match.user.is_online && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-black bg-[#22c55e]" />
                    )}
                  </div>
                  <p className="mt-1 max-w-14 truncate text-[10px] text-muted">{match.user.name}</p>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-1">
            {filtered.map((match) => {
              const isTyping = !!typingByMatch[match.id]
              return (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => navigate(`/chat/${match.id}`)}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left hover:bg-panel"
                >
                  <div className="relative">
                    <img
                      src={resolveMediaUrl(match.user.photo_url, 'https://i.pravatar.cc/100')}
                      alt={match.user.name}
                      className="h-12 w-12 rounded-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    {match.user.is_online && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-black bg-[#22c55e]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold">{match.user.name}</p>
                      <span className="text-[11px] text-muted">
                        {isTyping
                          ? ''
                          : match.last_message
                            ? new Date(match.last_message.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : new Date(match.matched_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                      </span>
                    </div>
                    <p className={`truncate text-sm ${isTyping ? 'font-medium text-lime' : 'text-muted'}`}>
                      {isTyping
                        ? 'typing…'
                        : `${match.muted ? 'Muted · ' : ''}${match.last_message?.body || 'It’s a match — say hi!'}`}
                    </p>
                  </div>
                  {!isTyping && (match.unread_count || 0) > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-lime px-1.5 text-[10px] font-bold text-ink">
                      {match.unread_count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      <BottomNav />
    </div>
  )
}

