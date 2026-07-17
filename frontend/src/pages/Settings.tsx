import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  ChevronRight,
  Eye,
  EyeOff,
  Heart,
  LogOut,
  MessageCircle,
  Trash2,
  UserRound,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { resolveMediaUrl } from '../lib/media'
import { telegramHaptic } from '../lib/telegram'
import { BRAND_NAME } from '../components/Brand'
import { BottomNav } from '../components/BottomNav'
import { Spinner } from '../components/Loading'

type NotifyKey = 'notify_matches' | 'notify_likes' | 'notify_messages'

const NOTIFY_ITEMS: {
  key: NotifyKey
  label: string
  hint: string
  Icon: typeof Bell
}[] = [
  { key: 'notify_matches', label: 'Matches', hint: 'Mutual likes', Icon: Heart },
  { key: 'notify_likes', label: 'Likes', hint: 'Someone liked you', Icon: Bell },
  { key: 'notify_messages', label: 'Messages', hint: 'New chat replies', Icon: MessageCircle },
]

const ease = [0.22, 1, 0.36, 1] as const

function Switch({ on }: { on: boolean }) {
  return (
    <span
      className={`relative h-7 w-[46px] shrink-0 rounded-full transition-colors duration-200 ${
        on ? 'bg-brand' : 'bg-white/10'
      }`}
      aria-hidden
    >
      <span
        className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white transition-transform duration-200 ${
          on ? 'translate-x-[21px]' : 'translate-x-[3px]'
        }`}
      />
    </span>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
      {children}
    </p>
  )
}

export function SettingsPage() {
  const { user, refresh, logout } = useAuth()
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [hiding, setHiding] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [savingNotify, setSavingNotify] = useState<NotifyKey | null>(null)

  const notify = {
    notify_matches: user?.notify_matches !== false,
    notify_likes: user?.notify_likes !== false,
    notify_messages: user?.notify_messages !== false,
  }

  const primary = user?.photos?.find((p) => p.is_primary) || user?.photos?.[0]
  const avatar = resolveMediaUrl(primary?.image_url || user?.photo_url, '/mingle_251_icon.png')
  const displayName = user?.profile?.name || user?.first_name || 'Your profile'
  const handle = user?.username
    ? `@${user.username}`
    : user?.telegram_id
      ? `Telegram · ${user.telegram_id}`
      : 'Account'
  const isHidden = user?.status === 'hidden'
  const busy = hiding || deleting || signingOut || savingNotify !== null

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(id)
  }, [toast])

  const flash = (type: 'ok' | 'err', text: string) => setToast({ type, text })

  const toggleHide = async () => {
    setHiding(true)
    try {
      const res = await api.hideProfile()
      await refresh()
      telegramHaptic('success')
      flash('ok', res.status === 'hidden' ? 'Hidden from discovery' : 'Visible in discovery again')
    } catch (e) {
      telegramHaptic('error')
      flash('err', e instanceof Error ? e.message : 'Could not update visibility')
    } finally {
      setHiding(false)
    }
  }

  const toggleNotify = async (key: NotifyKey) => {
    const next = !notify[key]
    setSavingNotify(key)
    try {
      await api.updateNotifications({ [key]: next })
      await refresh()
      telegramHaptic('selection')
    } catch (e) {
      telegramHaptic('error')
      flash('err', e instanceof Error ? e.message : 'Could not update notifications')
    } finally {
      setSavingNotify(null)
    }
  }

  const deleteAccount = async () => {
    if (!window.confirm(`Delete your ${BRAND_NAME} account permanently? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await api.deleteAccount()
      telegramHaptic('warning')
      logout()
    } catch (e) {
      telegramHaptic('error')
      flash('err', e instanceof Error ? e.message : 'Could not delete account')
      setDeleting(false)
    }
  }

  const signOut = async () => {
    setSigningOut(true)
    try {
      logout()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="app-shell relative overflow-hidden pb-28">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,_rgba(254,52,97,0.14),_transparent_70%)]"
        aria-hidden
      />

      <motion.header
        className="relative mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">
              {BRAND_NAME}
            </p>
            <h1 className="mt-2 font-display text-[2.35rem] leading-[0.95] tracking-tight text-white">
              Settings
            </h1>
          </div>
          <img
            src="/mingle_251_icon.png"
            alt=""
            className="mt-1 h-11 w-11 object-contain opacity-90"
            draggable={false}
          />
        </div>
      </motion.header>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.text}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={`relative mb-5 text-sm ${
              toast.type === 'err' ? 'text-red-300' : 'text-brand'
            }`}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Identity */}
      <motion.section
        className="relative mb-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04, duration: 0.45, ease }}
      >
        <Link
          to="/profile"
          className={`group flex items-center gap-4 ${busy ? 'pointer-events-none opacity-50' : ''}`}
        >
          <div className="relative shrink-0">
            <img
              src={avatar}
              alt=""
              className="h-[72px] w-[72px] rounded-full object-cover"
            />
            <span
              className={`absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full ring-2 ring-black ${
                isHidden ? 'bg-amber-400' : 'bg-brand'
              }`}
              title={isHidden ? 'Hidden' : 'Visible'}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-semibold tracking-tight text-white group-hover:text-white/95">
              {displayName}
            </p>
            <p className="mt-0.5 truncate text-sm text-muted">{handle}</p>
            <p className="mt-2 text-xs font-medium tracking-wide text-brand/90">
              View profile
              <ChevronRight className="ml-0.5 inline h-3.5 w-3.5 translate-y-[-1px]" strokeWidth={2} />
            </p>
          </div>
        </Link>
      </motion.section>

      {/* Notifications */}
      <motion.section
        className="relative mb-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.45, ease }}
      >
        <SectionLabel>Notifications</SectionLabel>
        <ul className="divide-y divide-white/[0.06]">
          {NOTIFY_ITEMS.map((item) => {
            const on = notify[item.key]
            const saving = savingNotify === item.key
            return (
              <li key={item.key}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleNotify(item.key)}
                  className="flex w-full items-center gap-3.5 py-4 text-left disabled:opacity-50"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.04] text-brand">
                    <item.Icon size={17} strokeWidth={1.8} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-white">{item.label}</span>
                    <span className="mt-0.5 block text-xs text-muted">{item.hint}</span>
                  </span>
                  {saving ? <Spinner className="h-4 w-4 text-brand" /> : <Switch on={on} />}
                  <span className="sr-only">
                    {item.label} {on ? 'on' : 'off'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <p className="mt-1 text-xs leading-relaxed text-white/30">
          Delivered via Telegram when you’re away.
        </p>
      </motion.section>

      {/* Privacy */}
      <motion.section
        className="relative mb-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.45, ease }}
      >
        <SectionLabel>Privacy</SectionLabel>
        <div className="divide-y divide-white/[0.06]">
          <button
            type="button"
            disabled={busy}
            onClick={() => void toggleHide()}
            className="flex w-full items-center gap-3.5 py-4 text-left disabled:opacity-50"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.04] text-brand">
              {isHidden ? (
                <EyeOff size={17} strokeWidth={1.8} aria-hidden />
              ) : (
                <Eye size={17} strokeWidth={1.8} aria-hidden />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium text-white">
                {hiding
                  ? isHidden
                    ? 'Unhiding…'
                    : 'Hiding…'
                  : isHidden
                    ? 'Unhide profile'
                    : 'Hide profile'}
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                {isHidden ? 'Invisible in discovery right now' : 'Pause discovery anytime'}
              </span>
            </span>
            {hiding ? <Spinner className="h-4 w-4 text-brand" /> : <Switch on={isHidden} />}
          </button>

          <Link
            to="/profile"
            className={`flex w-full items-center gap-3.5 py-4 ${busy ? 'pointer-events-none opacity-50' : ''}`}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.04] text-white/45">
              <UserRound size={17} strokeWidth={1.8} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium text-white">Edit profile</span>
              <span className="mt-0.5 block text-xs text-muted">Photos, bio, preferences</span>
            </span>
            <ChevronRight className="h-4 w-4 text-white/20" strokeWidth={1.8} aria-hidden />
          </Link>
        </div>
      </motion.section>

      {/* Session */}
      <motion.section
        className="relative mb-12"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.45, ease }}
      >
        <SectionLabel>Session</SectionLabel>
        <div className="divide-y divide-white/[0.06]">
          <button
            type="button"
            disabled={busy && !signingOut}
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3.5 py-4 text-left disabled:opacity-50"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.04] text-white/45">
              <LogOut size={17} strokeWidth={1.8} aria-hidden />
            </span>
            <span className="flex-1 text-[15px] font-medium text-white/90">
              {signingOut ? 'Signing out…' : 'Sign out'}
            </span>
            {signingOut ? <Spinner className="h-4 w-4 text-muted" /> : null}
          </button>

          <button
            type="button"
            disabled={busy && !deleting}
            onClick={() => void deleteAccount()}
            className="flex w-full items-center gap-3.5 py-4 text-left disabled:opacity-50"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-500/10 text-red-400/90">
              <Trash2 size={17} strokeWidth={1.8} aria-hidden />
            </span>
            <span className="flex-1 text-[15px] font-medium text-red-300/95">
              {deleting ? 'Deleting account…' : 'Delete account'}
            </span>
          </button>
        </div>
      </motion.section>

      <motion.footer
        className="relative mb-2 flex flex-col items-center gap-2.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28, duration: 0.5 }}
      >
        <img
          src="/mingle_251_icon.png"
          alt=""
          className="h-8 w-8 object-contain opacity-40"
          draggable={false}
        />
        <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-white/25">
          {BRAND_NAME}
        </p>
      </motion.footer>

      {deleting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-6 backdrop-blur-[2px]">
          <div className="w-full max-w-sm text-center">
            <Spinner className="mx-auto h-8 w-8 text-red-300" />
            <p className="mt-5 font-display text-2xl text-white">Deleting account…</p>
            <p className="mt-2 text-sm text-muted">Removing your profile and matches.</p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
