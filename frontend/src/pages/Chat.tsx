import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { bindConnectionState, getEcho } from '../lib/echo'
import { useNavBadges } from '../lib/navBadges'
import { pollMs } from '../lib/perf'
import type { ChatMessage, MatchItem } from '../types'
import { IconBack } from '../components/Icons'
import { resolveMediaUrl } from '../lib/media'

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

  // sent = 1 tick · delivered = 2 gray · seen/opened = 2 blue
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

function ChatSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col-reverse overflow-hidden px-4" aria-hidden>
      <div className="flex flex-col justify-end gap-3 py-4">
        <div className="flex justify-start">
          <div className="skeleton h-10 w-[58%] rounded-2xl rounded-bl-md" />
        </div>
        <div className="flex justify-end">
          <div className="skeleton h-10 w-[46%] rounded-2xl rounded-br-md" />
        </div>
        <div className="flex justify-start">
          <div className="skeleton h-16 w-[70%] rounded-2xl rounded-bl-md" />
        </div>
        <div className="flex justify-end">
          <div className="skeleton h-10 w-[40%] rounded-2xl rounded-br-md" />
        </div>
        <div className="flex justify-start">
          <div className="skeleton h-10 w-[52%] rounded-2xl rounded-bl-md" />
        </div>
        <div className="flex justify-end">
          <div className="skeleton h-12 w-[62%] rounded-2xl rounded-br-md" />
        </div>
      </div>
    </div>
  )
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
  return { ...msg, is_mine: mine, status }
}

export function ChatPage() {
  const { matchId } = useParams()
  const id = Number(matchId)
  const location = useLocation()
  const { user } = useAuth()
  const { refreshBadges } = useNavBadges()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [peer, setPeer] = useState<MatchItem['user'] | null>(null)
  const [body, setBody] = useState('')
  const [peerTyping, setPeerTyping] = useState(false)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const typingPulse = useRef<number | null>(null)
  const lastTypingSent = useRef(false)
  const typingHideTimer = useRef<number | null>(null)
  const userIdRef = useRef(user?.id)
  const inputFocused = useRef(false)
  const starterSent = useRef(false)
  const initialMessage =
    typeof (location.state as { initialMessage?: string } | null)?.initialMessage === 'string'
      ? (location.state as { initialMessage: string }).initialMessage
      : ''

  useEffect(() => {
    userIdRef.current = user?.id
  }, [user?.id])

  const scrollToLatest = useCallback((smooth = false) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  const upsertMessage = useCallback(
    (msg: ChatMessage) => {
      const normalized = normalizeMessage(msg, userIdRef.current)
      setMessages((prev) => {
        // Replace optimistic bubble when real message arrives
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

  const loadMessages = useCallback(async () => {
    if (!id) return
    const res = await api.getMessages(id)
    mergeServerMessages(res.data as ChatMessage[])
  }, [id, mergeServerMessages])

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
    emitTyping(true, true)
    stopTypingPulse()
    // Keep “typing” alive on the other phone (iMessage-style) while focused with text
    typingPulse.current = window.setInterval(() => {
      if (inputFocused.current && bodyRef.current.trim()) {
        emitTyping(true, true)
      }
    }, 2000)
  }

  const bodyRef = useRef('')
  useEffect(() => {
    bodyRef.current = body
  }, [body])

  // Typing fallback: when the websocket is down, poll the cached typing state.
  useEffect(() => {
    if (!id || connected) return
    let active = true
    const check = async () => {
      try {
        const res = await api.typingStatus(id)
        if (active) setPeerTyping(res.typing)
      } catch {
        /* ignore */
      }
    }
    void check()
    const timer = window.setInterval(() => void check(), pollMs(3000, 4000))
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [id, connected])

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
        // Load thread first (fast path); peer header can fill in after
        const msgs = await api.getMessages(id)
        if (!active) return
        mergeServerMessages(msgs.data as ChatMessage[])
        setLoading(false)
        void refreshBadges()

        const convos = await api.conversations()
        if (!active) return
        const match = (convos.data as MatchItem[]).find((m) => m.id === id)
        if (match) setPeer(match.user)
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : 'Failed to load chat')
          setLoading(false)
        }
      }
    }

    void boot()

    const echo = getEcho()
    const unbindConn = bindConnectionState((isUp) => {
      if (!active) return
      setConnected(isUp)
      if (isUp && pollTimer) {
        window.clearInterval(pollTimer)
        pollTimer = window.setInterval(() => void loadMessages().catch(() => undefined), pollMs(20000, 45000))
      }
    })

    const startPolling = (ms: number) => {
      if (pollTimer) window.clearInterval(pollTimer)
      pollTimer = window.setInterval(() => {
        void loadMessages().catch(() => undefined)
      }, ms)
    }
    startPolling(pollMs(5000, 15000))

    if (!echo) {
      return () => {
        active = false
        unbindConn()
        if (pollTimer) window.clearInterval(pollTimer)
        stopTypingPulse()
      }
    }

    const channel = echo.private(`match.${id}`)

    const onSent = (payload: { message: ChatMessage }) => {
      const incoming = payload.message
      upsertMessage(incoming)
      if (incoming.sender_id !== userIdRef.current) {
        setPeerTyping(false)
        // In open chat: delivered then seen (opened) → blue double ticks for sender
        void api
          .markDelivered(id, [incoming.id])
          .then(() => api.markRead(id))
          .then(() => refreshBadges())
          .catch(() => undefined)
      }
    }

    const onStatus = (payload: {
      messages: { id: number; delivered_at?: string | null; read_at?: string | null }[]
    }) => {
      applyStatus(payload.messages || [])
    }

    const onTyping = (payload: { user_id: number; typing: boolean }) => {
      if (payload.user_id === userIdRef.current) return
      if (typingHideTimer.current) window.clearTimeout(typingHideTimer.current)
      if (payload.typing) {
        setPeerTyping(true)
        // Safety only if they crash/leave without blur — refresh extends this
        typingHideTimer.current = window.setTimeout(() => setPeerTyping(false), 8000)
      } else {
        setPeerTyping(false)
      }
    }

    channel.listen('.message.sent', onSent)
    channel.listen('.message.status', onStatus)
    channel.listen('.user.typing', onTyping)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(channel as any).subscription?.bind?.('pusher:subscription_succeeded', () => {
      setConnected(true)
      startPolling(pollMs(25000, 60000))
    })

    return () => {
      active = false
      unbindConn()
      if (pollTimer) window.clearInterval(pollTimer)
      if (typingHideTimer.current) window.clearTimeout(typingHideTimer.current)
      stopTypingPulse()
      emitTyping(false, true)
      channel.stopListening('.message.sent')
      channel.stopListening('.message.status')
      channel.stopListening('.user.typing')
      echo.leave(`match.${id}`)
      setConnected(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, upsertMessage, applyStatus, loadMessages, mergeServerMessages])

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
      if (!lastTypingSent.current) startTypingPulse()
      else emitTyping(true)
    } else {
      stopTypingPulse()
      emitTyping(false, true)
    }
  }

  const onFocusInput = () => {
    inputFocused.current = true
    if (bodyRef.current.trim()) startTypingPulse()
  }

  const onBlurInput = () => {
    inputFocused.current = false
    stopTypingPulse()
    emitTyping(false, true)
  }

  const sendText = async (raw: string) => {
    if (!raw.trim() || !id || !user?.id) return
    const text = raw.trim()
    const clientId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimistic: ChatMessage = {
      id: -Date.now(),
      match_id: id,
      body: text,
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
      const real = normalizeMessage(
        { ...(res.message as ChatMessage), client_id: clientId, is_mine: true },
        user.id,
      )
      upsertMessage(real)
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.client_id === clientId ? { ...m, status: 'failed' } : m)),
      )
      setBody(text)
      setError(err instanceof Error ? err.message : 'Send failed')
    }
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    await sendText(body)
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

  return (
    <div className="mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden bg-black">
      <header className="flex shrink-0 items-center gap-3 border-b border-white/5 px-4 py-3 pt-[max(0.75rem,var(--app-top-spacing))]">
        <button type="button" className="grid h-9 w-9 place-items-center text-white/70" onClick={() => navigate('/messages')} aria-label="Back">
          <IconBack size={20} />
        </button>
        {loading && !peer ? (
          <div className="flex min-w-0 flex-1 items-center gap-3" aria-hidden>
            <div className="skeleton h-10 w-10 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton h-3 w-28 rounded-full" />
              <div className="skeleton h-2.5 w-16 rounded-full" />
            </div>
          </div>
        ) : peer ? (
          <Link to="/messages" className="flex min-w-0 flex-1 items-center gap-3">
            <img
              src={resolveMediaUrl(peer.photo_url, 'https://i.pravatar.cc/80')}
              alt={peer.name}
              className="h-10 w-10 rounded-full object-cover"
              decoding="async"
            />
            <div className="min-w-0">
              <p className="truncate font-semibold">{peer.name}</p>
              <p className="text-xs text-muted">
                {peerTyping ? (
                  <span className="text-lime">typing…</span>
                ) : connected ? (
                  peer.is_online ? 'Online' : 'Live'
                ) : (
                  'Connecting…'
                )}
              </p>
            </div>
          </Link>
        ) : null}
      </header>

      {loading ? (
        <ChatSkeleton />
      ) : (
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto overscroll-contain px-4"
        >
          <div className="flex flex-col justify-end gap-2 py-4">
            {error && <p className="text-center text-sm text-red-300">{error}</p>}
            {messages.length === 0 && !error && (
              <div className="rounded-2xl bg-panel p-4 text-center text-sm text-muted">
                You matched with {peer?.name || 'them'}. Say hello 👋
              </div>
            )}
            {messages.map((msg) => {
              const mine = msg.is_mine || msg.sender_id === user?.id
              return (
                <div key={msg.client_id || msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      mine
                        ? `rounded-br-md bg-lime text-ink ${msg.status === 'sending' ? 'opacity-80' : ''}`
                        : 'rounded-bl-md bg-panel-2 text-white'
                    }`}
                  >
                    <span>{msg.body}</span>
                    {mine && <StatusTicks status={msg.status} />}
                  </div>
                </div>
              )
            })}
            {peerTyping && (
              <div className="flex justify-start">
                <TypingDots />
              </div>
            )}
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => void send(e)}
        className="flex shrink-0 items-center gap-2 border-t border-white/5 px-3 py-3 pb-[max(12px,var(--safe-bottom))]"
      >
        <input
          className="field flex-1"
          placeholder="Type a message…"
          value={body}
          disabled={loading}
          onChange={(e) => onBodyChange(e.target.value)}
          onFocus={onFocusInput}
          onBlur={onBlurInput}
        />
        <button type="submit" disabled={loading || !body.trim()} className="btn-lime px-4 py-3">
          Send
        </button>
      </form>
    </div>
  )
}
