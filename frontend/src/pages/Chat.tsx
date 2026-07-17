import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { getEcho } from '../lib/echo'
import { useNavBadges } from '../lib/navBadges'
import type { ChatMessage, ChatSettings, DiscoverCard, MatchDate, MatchItem } from '../types'
import { IconBack } from '../components/Icons'
import { resolveMediaUrl } from '../lib/media'
import { ReportSheet } from '../components/ReportSheet'

function StatusTicks({ status }: { status?: ChatMessage['status'] }) {
  if (!status || status === 'received') return null

  if (status === 'sending') {
    return (
      <span className="ml-1.5 inline-flex items-center text-ink/35" aria-label="sending" title="Sending">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="8" cy="8" r="5.5" />
          <path d="M8 5v3.2L10 10" strokeLinecap="round" />
        </svg>
      </span>
    )
  }

  if (status === 'failed') {
    return (
      <span className="ml-1.5 text-[11px] font-bold text-red-700" aria-label="failed" title="Failed">
        !
      </span>
    )
  }

  const seen = status === 'seen'
  const delivered = status === 'delivered' || seen
  const color = seen ? '#1A73E8' : 'rgba(0,0,0,0.45)'

  return (
    <span
      className="ml-1.5 inline-flex translate-y-[1px] items-center"
      style={{ color }}
      aria-label={seen ? 'seen' : delivered ? 'delivered' : 'sent'}
      title={seen ? 'Seen' : delivered ? 'Delivered' : 'Sent'}
    >
      <svg viewBox="0 0 18 12" className="h-3 w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {delivered ? (
          <>
            <path d="M1.2 6.2 4.4 9.4 10.8 2.2" />
            <path d="M6.6 9.4 12.8 2.2" />
          </>
        ) : (
          <path d="M3.2 6.2 6.4 9.4 12.8 2.2" />
        )}
      </svg>
    </span>
  )
}

function TypingDots() {
  return (
    <div className="typing-bubble rounded-2xl rounded-bl-md bg-panel-2" aria-label="typing">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  )
}

function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatDateWhen(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function normalizeMessage(msg: ChatMessage, viewerId?: number): ChatMessage {
  const mine = msg.is_mine ?? msg.sender_id === viewerId
  let status = msg.status
  if (mine) {
    if (status === 'sending' || status === 'failed') {
      /* keep */
    } else {
      status = msg.read_at ? 'seen' : msg.delivered_at ? 'delivered' : status || 'sent'
    }
  } else {
    status = 'received'
  }
  return { ...msg, is_mine: mine, status, type: msg.type || 'text' }
}

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ChatPage() {
  const { matchId } = useParams()
  const id = Number(matchId)
  const location = useLocation()
  const { user } = useAuth()
  const { refreshBadges } = useNavBadges()
  const navigate = useNavigate()
  const locationPeer =
    (location.state as { peer?: DiscoverCard; initialMessage?: string } | null)?.peer ?? null
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [peer, setPeer] = useState<DiscoverCard | null>(locationPeer)
  const [body, setBody] = useState('')
  const [peerTyping, setPeerTyping] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [muted, setMuted] = useState(false)
  const [upcomingDate, setUpcomingDate] = useState<MatchDate | null>(null)
  const [busyAction, setBusyAction] = useState('')
  const [dateForm, setDateForm] = useState(() => {
    const d = new Date()
    d.setHours(d.getHours() + 24)
    d.setMinutes(0, 0, 0)
    return { scheduled_at: toLocalInputValue(d), place: '', note: '' }
  })
  const scrollerRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const typingPulse = useRef<number | null>(null)
  const lastTypingSent = useRef(false)
  const typingHideTimer = useRef<number | null>(null)
  const userIdRef = useRef(user?.id)
  const inputFocused = useRef(false)
  const starterSent = useRef(false)
  const bodyRef = useRef('')
  const initialMessage =
    typeof (location.state as { initialMessage?: string } | null)?.initialMessage === 'string'
      ? (location.state as { initialMessage: string }).initialMessage
      : ''

  const applyPeerTyping = useCallback((typing: boolean) => {
    if (typing) {
      setPeerTyping(true)
      if (typingHideTimer.current) window.clearTimeout(typingHideTimer.current)
      typingHideTimer.current = window.setTimeout(() => setPeerTyping(false), 5000)
      return
    }
    // Don't clear immediately on a single false poll — let the sticky timer expire.
  }, [])

  useEffect(() => {
    userIdRef.current = user?.id
  }, [user?.id])

  useEffect(() => {
    bodyRef.current = body
  }, [body])

  const scrollToLatest = useCallback((smooth = false) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  const upsertMessage = useCallback(
    (msg: ChatMessage) => {
      const normalized = normalizeMessage(msg, userIdRef.current)
      setMessages((prev) => {
        const byClient =
          normalized.client_id != null
            ? prev.findIndex((m) => m.client_id === normalized.client_id)
            : -1
        const byPendingBody =
          normalized.id > 0
            ? prev.findIndex(
                (m) =>
                  m.id < 0 &&
                  m.is_mine &&
                  m.body === normalized.body &&
                  (m.status === 'sending' || m.status === 'failed'),
              )
            : -1
        const idx = byClient >= 0 ? byClient : byPendingBody
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = { ...next[idx], ...normalized }
          return next
        }
        if (prev.some((m) => m.id === normalized.id && normalized.id > 0)) {
          return prev.map((m) => (m.id === normalized.id ? { ...m, ...normalized } : m))
        }
        return [...prev, normalized]
      })
      if (stickToBottom.current) {
        requestAnimationFrame(() => scrollToLatest(false))
      }
    },
    [scrollToLatest],
  )

  const applyStatus = useCallback(
    (updates: { id: number; delivered_at?: string | null; read_at?: string | null }[]) => {
      setMessages((prev) =>
        prev.map((m) => {
          const hit = updates.find((u) => u.id === m.id)
          if (!hit) return m
          const delivered_at = hit.delivered_at ?? m.delivered_at
          const read_at = hit.read_at ?? m.read_at
          return normalizeMessage({ ...m, delivered_at, read_at }, userIdRef.current)
        }),
      )
    },
    [],
  )

  const mergeServerMessages = useCallback((server: ChatMessage[]) => {
    setMessages((prev) => {
      const pending = prev.filter((m) => m.id < 0)
      const normalized = server.map((m) => normalizeMessage(m, userIdRef.current))
      const stillPending = pending.filter(
        (p) =>
          !normalized.some(
            (s) => s.is_mine && s.body === p.body && Math.abs(new Date(s.created_at).getTime() - Date.now()) < 60000,
          ),
      )
      return [...normalized, ...stillPending]
    })
  }, [])

  const applySettings = (settings?: ChatSettings | null) => {
    if (!settings) return
    setMuted(Boolean(settings.muted))
    setUpcomingDate((settings.upcoming_date as MatchDate) || null)
  }

  const loadMessages = useCallback(async (markSeen = false) => {
    if (!id) return
    const res = await api.getMessages(id, { markSeen })
    const data = res.data as ChatMessage[]
    mergeServerMessages(data)
    applySettings(res.settings as ChatSettings | undefined)
    if (res.peer) setPeer(res.peer as DiscoverCard)
    if (typeof res.peer_typing === 'boolean') {
      applyPeerTyping(res.peer_typing)
    }

    // Lightweight seen sync without re-running mark on every poll payload.
    if (
      !markSeen &&
      document.visibilityState === 'visible' &&
      data.some((m) => m.sender_id !== userIdRef.current && !m.read_at)
    ) {
      void api
        .markRead(id)
        .then(() => refreshBadges())
        .catch(() => undefined)
    }
  }, [id, mergeServerMessages, refreshBadges, applyPeerTyping])

  const stopTypingPulse = () => {
    if (typingPulse.current) {
      window.clearInterval(typingPulse.current)
      typingPulse.current = null
    }
  }

  const emitTyping = (typing: boolean, force = false) => {
    if (!id) return
    if (!force && lastTypingSent.current === typing) return
    lastTypingSent.current = typing
    void api.typing(id, typing).catch(() => undefined)
  }

  const startTypingPulse = () => {
    if (typingPulse.current) return
    emitTyping(true, true)
    typingPulse.current = window.setInterval(() => {
      if (bodyRef.current.trim()) {
        emitTyping(true, true)
      }
    }, 2000)
  }

  // Backup typing poll (message poll already includes peer_typing).
  useEffect(() => {
    if (!id) return
    let active = true
    const check = async () => {
      try {
        const res = await api.typingStatus(id)
        if (!active) return
        applyPeerTyping(res.typing)
      } catch {
        /* ignore */
      }
    }
    void check()
    const timer = window.setInterval(() => void check(), 2000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [id, applyPeerTyping])

  useEffect(() => {
    if (!id) return
    const ping = () => {
      void api.presence(id).catch(() => undefined)
    }
    ping()
    const timer = window.setInterval(ping, 30000)
    const onFocus = () => ping()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    let active = true
    let pollTimer: number | undefined

    const boot = async () => {
      setLoading(true)
      try {
        const msgs = await api.getMessages(id, { markSeen: true })
        if (!active) return
        mergeServerMessages(msgs.data as ChatMessage[])
        applySettings(msgs.settings as ChatSettings | undefined)
        if (msgs.peer) setPeer(msgs.peer as DiscoverCard)
        if (typeof msgs.peer_typing === 'boolean') applyPeerTyping(msgs.peer_typing)
        setLoading(false)
        void refreshBadges()

        // Fallback if an older API build omitted peer on the messages payload.
        if (!msgs.peer) {
          const convos = await api.conversations().catch(() => null)
          if (!active || !convos) return
          const match = (convos.data as MatchItem[]).find((m) => Number(m.id) === id)
          if (match?.user) {
            setPeer(match.user)
            if (match.upcoming_date) setUpcomingDate(match.upcoming_date)
            if (typeof match.muted === 'boolean') setMuted(match.muted)
          }
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : 'Failed to load chat')
          setLoading(false)
        }
      }
    }

    void boot()

    // Keep a fast poll while the chat is open. Echo events are bonus when they work;
    // never slow the poll down just because the socket claims "connected".
    const startPolling = (ms: number) => {
      if (pollTimer) window.clearInterval(pollTimer)
      pollTimer = window.setInterval(() => {
        void loadMessages(false).catch(() => undefined)
      }, ms)
    }
    startPolling(1500)

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadMessages(true).catch(() => undefined)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    const echo = getEcho()
    if (!echo) {
      return () => {
        active = false
        if (pollTimer) window.clearInterval(pollTimer)
        document.removeEventListener('visibilitychange', onVisible)
        window.removeEventListener('focus', onVisible)
        stopTypingPulse()
      }
    }

    const channel = echo.private(`match.${id}`)

    const onSent = (payload: { message: ChatMessage }) => {
      const incoming = payload.message
      upsertMessage(incoming)
      if (incoming.sender_id !== userIdRef.current) {
        if (typingHideTimer.current) window.clearTimeout(typingHideTimer.current)
        setPeerTyping(false)
        void api
          .markDelivered(id, [incoming.id])
          .then(() => api.markRead(id))
          .then(() => refreshBadges())
          .catch(() => undefined)
      }
      if (incoming.type === 'date_proposal' || incoming.type === 'date_update') {
        void loadMessages(false).catch(() => undefined)
      }
    }

    const onStatus = (payload: {
      messages: { id: number; delivered_at?: string | null; read_at?: string | null }[]
    }) => {
      applyStatus(payload.messages || [])
    }

    const onTyping = (payload: { user_id: number; typing: boolean }) => {
      if (payload.user_id === userIdRef.current) return
      applyPeerTyping(payload.typing)
      if (!payload.typing) {
        if (typingHideTimer.current) window.clearTimeout(typingHideTimer.current)
        setPeerTyping(false)
      }
    }

    channel.listen('.message.sent', onSent)
    channel.listen('.message.status', onStatus)
    channel.listen('.user.typing', onTyping)

    return () => {
      active = false
      if (pollTimer) window.clearInterval(pollTimer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      stopTypingPulse()
      emitTyping(false, true)
      channel.stopListening('.message.sent')
      channel.stopListening('.message.status')
      channel.stopListening('.user.typing')
      echo.leave(`match.${id}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useLayoutEffect(() => {
    if (stickToBottom.current) scrollToLatest(false)
  }, [messages.length, peerTyping, scrollToLatest])

  const onScroll = () => {
    const el = scrollerRef.current
    if (!el) return
    stickToBottom.current = el.scrollTop < 48
  }

  const onBodyChange = (value: string) => {
    setBody(value)
    if (!id) return
    if (value.trim()) {
      startTypingPulse()
    } else {
      stopTypingPulse()
      emitTyping(false, true)
    }
  }

  const sendText = async (raw: string) => {
    if (!raw.trim() || !id || !user?.id) return
    const text = raw.trim()
    const clientId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimistic: ChatMessage = {
      id: -Date.now(),
      match_id: id,
      body: text,
      type: 'text',
      sender_id: user.id,
      is_mine: true,
      created_at: new Date().toISOString(),
      status: 'sending',
      client_id: clientId,
    }

    setBody('')
    stopTypingPulse()
    emitTyping(false, true)
    stickToBottom.current = true
    setError('')
    upsertMessage(optimistic)
    scrollToLatest(false)

    try {
      const res = await api.sendMessage(id, text)
      upsertMessage({
        ...(res.message as ChatMessage),
        client_id: clientId,
        is_mine: true,
      })
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.client_id === clientId ? { ...m, status: 'failed' } : m)),
      )
      setBody(text)
      setError(err instanceof Error ? err.message : 'Send failed')
    }
  }

  useEffect(() => {
    if (loading || starterSent.current || !initialMessage || !id || !user?.id) return
    if (messages.length > 0) {
      starterSent.current = true
      return
    }
    starterSent.current = true
    navigate(location.pathname, { replace: true, state: null })
    void sendText(initialMessage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, messages.length, initialMessage, id, user?.id])

  const toggleMute = async () => {
    if (!id) return
    setBusyAction('mute')
    try {
      const next = !muted
      const res = await api.updateChatSettings(id, next)
      applySettings(res.settings as ChatSettings)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update settings')
    } finally {
      setBusyAction('')
    }
  }

  const submitDate = async () => {
    if (!id || !dateForm.scheduled_at) return
    setBusyAction('date')
    setError('')
    try {
      const iso = new Date(dateForm.scheduled_at).toISOString()
      const res = await api.proposeDate(id, {
        scheduled_at: iso,
        place: dateForm.place.trim() || undefined,
        note: dateForm.note.trim() || undefined,
      })
      upsertMessage(res.message as ChatMessage)
      setUpcomingDate(res.date as MatchDate)
      setDateOpen(false)
      setSettingsOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not propose date')
    } finally {
      setBusyAction('')
    }
  }

  const respondToDate = async (dateId: number, status: 'accepted' | 'declined' | 'cancelled') => {
    if (!id) return
    setBusyAction(`date-${dateId}-${status}`)
    try {
      const res = await api.respondDate(id, dateId, status)
      upsertMessage(res.message as ChatMessage)
      setUpcomingDate(res.date as MatchDate)
      await loadMessages()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update date')
    } finally {
      setBusyAction('')
    }
  }

  const doUnmatch = async () => {
    if (!id || !window.confirm(`Unmatch with ${peer?.name || 'this person'}?`)) return
    setBusyAction('unmatch')
    try {
      await api.unmatch(id)
      navigate('/messages', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not unmatch')
      setBusyAction('')
    }
  }

  const doBlock = async () => {
    if (!peer?.id || !window.confirm(`Block ${peer.name}? You will unmatch and stop seeing each other.`)) return
    setBusyAction('block')
    try {
      await api.block(peer.id)
      navigate('/messages', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not block')
      setBusyAction('')
    }
  }

  const threaded = useMemo(() => {
    const rows: { kind: 'day' | 'msg'; label?: string; msg?: ChatMessage }[] = []
    let lastDay = ''
    for (const msg of messages) {
      const day = dayLabel(msg.created_at)
      if (day !== lastDay) {
        rows.push({ kind: 'day', label: day })
        lastDay = day
      }
      rows.push({ kind: 'msg', msg })
    }
    return rows
  }, [messages])

  return (
    <div className="mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden bg-black">
      <header className="flex shrink-0 items-center gap-2 border-b border-white/5 px-3 py-3 pt-[max(0.75rem,var(--app-top-spacing))]">
        <button type="button" className="grid h-9 w-9 place-items-center text-white/70" onClick={() => navigate('/messages')} aria-label="Back">
          <IconBack size={20} />
        </button>
        {peer ? (
          <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setSettingsOpen(true)}>
            <img
              src={resolveMediaUrl(peer.photo_url, 'https://i.pravatar.cc/80')}
              alt={peer.name}
              className="h-10 w-10 rounded-full object-cover"
              decoding="async"
            />
            <div className="min-w-0">
              <p className="truncate font-semibold">
                {peer.name}
                {muted ? <span className="ml-1 text-[10px] font-medium text-white/40">Muted</span> : null}
              </p>
              <p className="text-xs text-muted">
                {peerTyping ? (
                  <span className="text-lime">typing…</span>
                ) : peer.is_online ? (
                  'Online'
                ) : peer.last_active ? (
                  `Active ${new Date(peer.last_active).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                ) : (
                  'Offline'
                )}
              </p>
            </div>
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="skeleton h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="skeleton h-3.5 w-28 rounded-full" />
              <div className="skeleton h-2.5 w-16 rounded-full" />
            </div>
          </div>
        )}
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-full bg-panel text-lg text-white/80"
          onClick={() => setDateOpen(true)}
          aria-label="Set a date"
          title="Set a date"
        >
          📅
        </button>
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-full bg-panel text-white/80"
          onClick={() => setSettingsOpen(true)}
          aria-label="Chat settings"
        >
          ⋮
        </button>
      </header>

      {upcomingDate && (upcomingDate.status === 'pending' || upcomingDate.status === 'accepted') ? (
        <div className="mx-3 mt-2 shrink-0 rounded-2xl border border-lime/25 bg-lime/10 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-lime">
                {upcomingDate.status === 'accepted' ? 'Date planned' : 'Date proposed'}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white">{formatDateWhen(upcomingDate.scheduled_at)}</p>
              {upcomingDate.place ? <p className="text-xs text-white/65">{upcomingDate.place}</p> : null}
            </div>
            {upcomingDate.status === 'pending' && upcomingDate.proposed_by !== user?.id ? (
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  className="rounded-full bg-lime px-2.5 py-1 text-[11px] font-bold text-ink"
                  disabled={!!busyAction}
                  onClick={() => void respondToDate(upcomingDate.id, 'accepted')}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white"
                  disabled={!!busyAction}
                  onClick={() => void respondToDate(upcomingDate.id, 'declined')}
                >
                  Decline
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto overscroll-contain px-4"
      >
        <div className="flex flex-col justify-end gap-2 py-4">
          {error ? <p className="text-center text-sm text-red-300">{error}</p> : null}
          {!loading && messages.length === 0 && !error ? (
            <div className="rounded-2xl bg-panel p-4 text-center text-sm text-muted">
              You matched with {peer?.name || 'them'}. Say hello 👋
              <button
                type="button"
                className="mt-3 block w-full rounded-full border border-white/10 py-2 text-xs font-semibold text-lime"
                onClick={() => setDateOpen(true)}
              >
                Or set a date
              </button>
            </div>
          ) : null}

          {threaded.map((row, i) => {
            if (row.kind === 'day') {
              return (
                <div key={`day-${row.label}-${i}`} className="my-1 flex justify-center">
                  <span className="rounded-full bg-white/8 px-3 py-1 text-[11px] font-semibold text-white/50">
                    {row.label}
                  </span>
                </div>
              )
            }
            const msg = row.msg!
            const mine = msg.is_mine || msg.sender_id === user?.id
            if (msg.type === 'date_proposal') {
              const st = msg.meta?.status || 'pending'
              return (
                <div key={msg.client_id || msg.id} className="flex justify-center px-2">
                  <div className="w-full max-w-[92%] rounded-2xl border border-white/10 bg-panel-2 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-lime">Date proposal</p>
                    <p className="mt-1 text-sm font-semibold">{formatDateWhen(msg.meta?.scheduled_at)}</p>
                    {msg.meta?.place ? <p className="mt-0.5 text-xs text-muted">{msg.meta.place}</p> : null}
                    {msg.meta?.note ? <p className="mt-2 text-sm text-white/80">{msg.meta.note}</p> : null}
                    <p className="mt-2 text-[11px] capitalize text-white/45">{st}</p>
                    {!mine && st === 'pending' && msg.meta?.date_id ? (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          className="btn-lime flex-1 py-2 text-xs"
                          disabled={!!busyAction}
                          onClick={() => void respondToDate(msg.meta!.date_id!, 'accepted')}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="flex-1 rounded-full bg-white/10 py-2 text-xs font-bold"
                          disabled={!!busyAction}
                          onClick={() => void respondToDate(msg.meta!.date_id!, 'declined')}
                        >
                          Decline
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            }
            if (msg.type === 'date_update') {
              return (
                <div key={msg.client_id || msg.id} className="flex justify-center">
                  <span className="rounded-full bg-white/8 px-3 py-1.5 text-center text-[12px] text-white/60">
                    {msg.body}
                  </span>
                </div>
              )
            }
            return (
              <div key={msg.client_id || msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    mine
                      ? `rounded-br-md bg-lime text-ink ${msg.status === 'sending' ? 'opacity-80' : ''}`
                      : 'rounded-bl-md bg-panel-2 text-white'
                  }`}
                >
                  <span className="whitespace-pre-wrap break-words">{msg.body}</span>
                  <span className={`mt-1 flex items-center justify-end text-[10px] ${mine ? 'text-ink/45' : 'text-white/35'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {mine ? <StatusTicks status={msg.status} /> : null}
                  </span>
                </div>
              </div>
            )
          })}
          {peerTyping ? (
            <div className="flex justify-start">
              <TypingDots />
            </div>
          ) : null}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void sendText(body)
        }}
        className="flex shrink-0 items-center gap-2 border-t border-white/5 px-3 py-3 pb-[max(12px,var(--safe-bottom))]"
      >
        <input
          className="field flex-1"
          placeholder="Type a message…"
          value={body}
          disabled={loading}
          onChange={(e) => onBodyChange(e.target.value)}
          onInput={(e) => onBodyChange((e.target as HTMLInputElement).value)}
          onFocus={() => {
            inputFocused.current = true
            if (bodyRef.current.trim()) startTypingPulse()
          }}
          onBlur={() => {
            inputFocused.current = false
            stopTypingPulse()
            emitTyping(false, true)
          }}
        />
        <button type="submit" disabled={loading || !body.trim()} className="btn-lime px-4 py-3">
          Send
        </button>
      </form>

      {settingsOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setSettingsOpen(false)}>
          <div
            className="w-full max-w-[430px] rounded-t-3xl bg-[#141414] p-5 pb-[max(1.25rem,var(--safe-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Chat settings</h2>
              <button type="button" className="text-sm text-muted" onClick={() => setSettingsOpen(false)}>
                Close
              </button>
            </div>
            <div className="space-y-2">
              <button type="button" className="flex w-full items-center justify-between rounded-2xl bg-panel px-4 py-3.5 text-left" onClick={() => void toggleMute()} disabled={busyAction === 'mute'}>
                <span className="font-semibold">{muted ? 'Unmute chat' : 'Mute notifications'}</span>
                <span className="text-xs text-muted">{muted ? 'On' : 'Off'}</span>
              </button>
              <button type="button" className="w-full rounded-2xl bg-panel px-4 py-3.5 text-left font-semibold" onClick={() => { setSettingsOpen(false); setDateOpen(true) }}>
                Set a date
              </button>
              <button type="button" className="w-full rounded-2xl bg-panel px-4 py-3.5 text-left font-semibold" onClick={() => { setSettingsOpen(false); setReportOpen(true) }}>
                Report
              </button>
              <button type="button" className="w-full rounded-2xl bg-panel px-4 py-3.5 text-left font-semibold text-amber-300" onClick={() => void doUnmatch()} disabled={!!busyAction}>
                Unmatch
              </button>
              <button type="button" className="w-full rounded-2xl bg-panel px-4 py-3.5 text-left font-semibold text-red-300" onClick={() => void doBlock()} disabled={!!busyAction}>
                Block
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {dateOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setDateOpen(false)}>
          <div
            className="w-full max-w-[430px] rounded-t-3xl bg-[#141414] p-5 pb-[max(1.25rem,var(--safe-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Set a date</h2>
              <button type="button" className="text-sm text-muted" onClick={() => setDateOpen(false)}>
                Close
              </button>
            </div>
            <label className="mb-3 block text-xs font-semibold text-muted">
              When
              <input
                type="datetime-local"
                className="field mt-1.5"
                value={dateForm.scheduled_at}
                onChange={(e) => setDateForm((f) => ({ ...f, scheduled_at: e.target.value }))}
              />
            </label>
            <label className="mb-3 block text-xs font-semibold text-muted">
              Place (optional)
              <input
                className="field mt-1.5"
                placeholder="Coffee shop, park…"
                value={dateForm.place}
                onChange={(e) => setDateForm((f) => ({ ...f, place: e.target.value }))}
              />
            </label>
            <label className="mb-4 block text-xs font-semibold text-muted">
              Note (optional)
              <input
                className="field mt-1.5"
                placeholder="Looking forward to it!"
                value={dateForm.note}
                onChange={(e) => setDateForm((f) => ({ ...f, note: e.target.value }))}
              />
            </label>
            <button
              type="button"
              className="btn-lime w-full justify-center py-3.5"
              disabled={busyAction === 'date' || !dateForm.scheduled_at}
              onClick={() => void submitDate()}
            >
              {busyAction === 'date' ? 'Sending…' : 'Send date proposal'}
            </button>
          </div>
        </div>
      ) : null}

      <ReportSheet
        open={reportOpen}
        name={peer?.name}
        onClose={() => setReportOpen(false)}
        onSubmit={(reason, block) => {
          if (!peer?.id) return
          void (async () => {
            try {
              await api.report(peer.id, reason)
              if (block) await api.block(peer.id)
              setReportOpen(false)
              if (block) navigate('/messages', { replace: true })
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Report failed')
            }
          })()
        }}
      />
    </div>
  )
}
