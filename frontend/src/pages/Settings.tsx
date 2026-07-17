import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bell,
  ChevronRight,
  Eye,
  EyeOff,
  LogOut,
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

const NOTIFY_ITEMS: { key: NotifyKey; label: string; hint: string }[] = [
  { key: 'notify_matches', label: 'New matches', hint: 'When someone likes you back' },
  { key: 'notify_likes', label: 'New likes', hint: 'When someone likes your profile' },
  { key: 'notify_messages', label: 'New messages', hint: 'When you get a chat reply' },
]

function Toggle({ on, busy }: { on: boolean; busy?: boolean }) {
  return (
    <span
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
        on ? 'bg-brand' : 'bg-white/12'
      } ${busy ? 'opacity-60' : ''}`}
      aria-hidden
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          on ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </span>
  )
}

export function SettingsPage() {
  const { user, refresh, logout } = useAuth()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
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
  const handle = user?.username ? `@${user.username}` : user?.telegram_id ? `ID ${user.telegram_id}` : 'Account'
  const isHidden = user?.status === 'hidden'
  const busy = hiding || deleting || signingOut || savingNotify !== null

  const toggleHide = async () => {
    setHiding(true)
    setError('')
    setMessage('')
    try {
      const res = await api.hideProfile()
      await refresh()
      telegramHaptic('success')
      setMessage(res.status === 'hidden' ? 'You’re hidden from discovery' : 'You’re visible in discovery again')
    } catch (e) {
      telegramHaptic('error')
      setError(e instanceof Error ? e.message : 'Could not update visibility')
    } finally {
      setHiding(false)
    }
  }

  const toggleNotify = async (key: NotifyKey) => {
    const next = !notify[key]
    setSavingNotify(key)
    setError('')
    setMessage('')
    try {
      await api.updateNotifications({ [key]: next })
      await refresh()
      telegramHaptic('success')
    } catch (e) {
      telegramHaptic('error')
      setError(e instanceof Error ? e.message : 'Could not update notifications')
    } finally {
      setSavingNotify(null)
    }
  }

  const deleteAccount = async () => {
    if (!window.confirm(`Delete your ${BRAND_NAME} account permanently? This cannot be undone.`)) return
    setDeleting(true)
    setError('')
    try {
      await api.deleteAccount()
      telegramHaptic('warning')
      logout()
    } catch (e) {
      telegramHaptic('error')
      setError(e instanceof Error ? e.message : 'Could not delete account')
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
    <div className="app-shell pb-28">
      <motion.header
        className="mb-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Account</p>
        <h1 className="mt-1 font-display text-[2rem] leading-none tracking-tight text-white">Settings</h1>
      </motion.header>

      {(message || error) && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-4 rounded-2xl px-3.5 py-2.5 text-sm ${
            error ? 'bg-red-500/12 text-red-300' : 'bg-brand/12 text-brand'
          }`}
        >
          {error || message}
        </motion.p>
      )}

      <motion.section
        className="mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <Link
          to="/profile"
          className={`flex items-center gap-3.5 rounded-[24px] bg-gradient-to-br from-panel to-panel-2 p-3.5 ring-1 ring-white/[0.06] ${
            busy ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          <img
            src={avatar}
            alt=""
            className="h-16 w-16 rounded-full object-cover ring-2 ring-brand/35"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold tracking-tight text-white">{displayName}</p>
            <p className="truncate text-sm text-muted">{handle}</p>
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isHidden ? 'bg-amber-400' : user?.status === 'active' ? 'bg-brand' : 'bg-white/40'
                }`}
              />
              {isHidden ? 'Hidden' : user?.status || 'Active'}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/25" strokeWidth={1.8} aria-hidden />
        </Link>
      </motion.section>

      <motion.section
        className="mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-3 flex items-center gap-2 px-0.5">
          <Bell className="h-4 w-4 text-brand" strokeWidth={1.8} aria-hidden />
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Notifications</h2>
        </div>
        <div className="overflow-hidden rounded-[22px] ring-1 ring-white/[0.06]">
          {NOTIFY_ITEMS.map((item, i) => {
            const on = notify[item.key]
            const saving = savingNotify === item.key
            return (
              <button
                key={item.key}
                type="button"
                disabled={busy}
                onClick={() => void toggleNotify(item.key)}
                className={`flex w-full items-center gap-3 bg-panel px-4 py-3.5 text-left transition-colors disabled:opacity-50 ${
                  i > 0 ? 'border-t border-white/[0.06]' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="mt-0.5 text-xs text-muted">{item.hint}</p>
                </div>
                {saving ? <Spinner className="h-4 w-4 text-brand" /> : <Toggle on={on} />}
                <span className="sr-only">
                  {item.label} {on ? 'on' : 'off'}
                  {saving ? ', saving' : ''}
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-2.5 px-0.5 text-xs leading-relaxed text-muted">
          Telegram alerts when you’re away from {BRAND_NAME}.
        </p>
      </motion.section>

      <motion.section
        className="mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-3 flex items-center gap-2 px-0.5">
          {isHidden ? (
            <EyeOff className="h-4 w-4 text-brand" strokeWidth={1.8} aria-hidden />
          ) : (
            <Eye className="h-4 w-4 text-brand" strokeWidth={1.8} aria-hidden />
          )}
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Privacy</h2>
        </div>
        <div className="overflow-hidden rounded-[22px] ring-1 ring-white/[0.06]">
          <button
            type="button"
            disabled={busy}
            onClick={() => void toggleHide()}
            className="flex w-full items-center gap-3 bg-panel px-4 py-3.5 text-left disabled:opacity-50"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">
                {hiding ? (isHidden ? 'Unhiding…' : 'Hiding…') : isHidden ? 'Unhide profile' : 'Hide profile'}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {isHidden
                  ? 'You’re currently invisible in discovery'
                  : 'Pause discovery without deleting your account'}
              </p>
            </div>
            {hiding ? <Spinner className="h-4 w-4 text-brand" /> : <Toggle on={isHidden} />}
          </button>
          <Link
            to="/profile"
            className={`flex w-full items-center gap-3 border-t border-white/[0.06] bg-panel px-4 py-3.5 ${
              busy ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            <UserRound className="h-4 w-4 shrink-0 text-white/35" strokeWidth={1.8} aria-hidden />
            <span className="flex-1 text-sm font-medium text-white">Edit profile & preferences</span>
            <ChevronRight className="h-4 w-4 text-white/25" strokeWidth={1.8} aria-hidden />
          </Link>
        </div>
      </motion.section>

      <motion.section
        className="mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-3 px-0.5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Account</h2>
        </div>
        <div className="overflow-hidden rounded-[22px] ring-1 ring-white/[0.06]">
          <button
            type="button"
            disabled={busy && !signingOut}
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 bg-panel px-4 py-3.5 text-left disabled:opacity-50"
          >
            <LogOut className="h-4 w-4 shrink-0 text-white/40" strokeWidth={1.8} aria-hidden />
            <span className="flex-1 text-sm font-medium text-white/85">
              {signingOut ? 'Signing out…' : 'Sign out'}
            </span>
            {signingOut ? <Spinner className="h-4 w-4 text-muted" /> : null}
          </button>
          <button
            type="button"
            disabled={busy && !deleting}
            onClick={() => void deleteAccount()}
            className="flex w-full items-center gap-3 border-t border-white/[0.06] bg-panel px-4 py-3.5 text-left disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4 shrink-0 text-red-400/80" strokeWidth={1.8} aria-hidden />
            <span className="flex-1 text-sm font-medium text-red-300">
              {deleting ? 'Deleting account…' : 'Delete account'}
            </span>
          </button>
        </div>
      </motion.section>

      <footer className="mb-4 flex flex-col items-center gap-2 opacity-70">
        <img src="/mingle_251_icon.png" alt="" className="h-10 w-10 object-contain" draggable={false} />
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted uppercase">{BRAND_NAME}</p>
      </footer>

      {deleting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[24px] bg-panel p-6 text-center ring-1 ring-white/[0.08]">
            <Spinner className="mx-auto h-8 w-8 text-red-300" />
            <p className="mt-4 text-lg font-bold">Deleting account…</p>
            <p className="mt-2 text-sm text-muted">Please wait while we remove your data.</p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
