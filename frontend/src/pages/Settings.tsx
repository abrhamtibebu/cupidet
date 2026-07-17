import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, LogOut, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { telegramHaptic } from '../lib/telegram'
import { BRAND_NAME } from '../components/Brand'
import { BottomNav } from '../components/BottomNav'
import { MediaImage } from '../components/MediaImage'
import { Spinner } from '../components/Loading'

type NotifyKey = 'notify_matches' | 'notify_likes' | 'notify_messages'

const NOTIFY_ITEMS: { key: NotifyKey; label: string }[] = [
  { key: 'notify_matches', label: 'Matches' },
  { key: 'notify_likes', label: 'Likes' },
  { key: 'notify_messages', label: 'Messages' },
]

const ease = [0.22, 1, 0.36, 1] as const

function Switch({ on }: { on: boolean }) {
  return (
    <span className={`settings-switch ${on ? 'is-on' : ''}`} aria-hidden>
      <span className="settings-switch-knob" />
    </span>
  )
}

export function SettingsPage() {
  const { user, refresh, logout } = useAuth()
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
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
  const displayName = user?.profile?.name || user?.first_name || 'Your profile'
  const handle = user?.username ? `@${user.username}` : null
  const location = user?.profile?.location?.trim() || null
  const isHidden = user?.status === 'hidden'
  const busy = hiding || deleting || signingOut || savingNotify !== null

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(t)
  }, [toast])

  const showToast = (kind: 'ok' | 'err', text: string) => setToast({ kind, text })

  const toggleHide = async () => {
    setHiding(true)
    try {
      const res = await api.hideProfile()
      await refresh()
      telegramHaptic('success')
      showToast('ok', res.status === 'hidden' ? 'Hidden from discovery' : 'Visible in discovery')
    } catch (e) {
      telegramHaptic('error')
      showToast('err', e instanceof Error ? e.message : 'Could not update visibility')
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
      telegramHaptic('success')
    } catch (e) {
      telegramHaptic('error')
      showToast('err', e instanceof Error ? e.message : 'Could not update notifications')
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
      showToast('err', e instanceof Error ? e.message : 'Could not delete account')
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
    <div className="settings-page app-shell pb-28">
      <div className="settings-atmosphere" aria-hidden />

      <motion.header
        className="relative mb-7"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">{BRAND_NAME}</p>
        <h1 className="mt-1.5 font-display text-[2.35rem] leading-[0.95] tracking-tight text-white">
          Settings
        </h1>
      </motion.header>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.text}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={`relative mb-5 text-sm ${
              toast.kind === 'err' ? 'text-red-300' : 'text-brand'
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
        transition={{ delay: 0.05, duration: 0.45, ease }}
      >
        <Link to="/profile" className={`settings-identity ${busy ? 'pointer-events-none opacity-50' : ''}`}>
          <MediaImage
            src={primary?.image_url || user?.photo_url}
            fallbacks={[user?.photo_url, primary?.image_url]}
            alt=""
            className="settings-identity-photo"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[1.65rem] leading-none tracking-tight text-white">
              {displayName}
            </p>
            <p className="mt-2 truncate text-sm text-white/45">
              {[handle, location].filter(Boolean).join(' · ') || 'Edit your profile'}
            </p>
            <p className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
              View profile
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </p>
          </div>
        </Link>
      </motion.section>

      {/* Discovery */}
      <motion.section
        className="relative mb-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.45, ease }}
      >
        <h2 className="settings-section-title">Discovery</h2>
        <p className="mt-1 max-w-[22rem] text-sm leading-relaxed text-muted">
          Control whether people can find you while you take a break.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void toggleHide()}
          className="settings-discovery mt-5 disabled:opacity-50"
        >
          <div className="min-w-0 flex-1 text-left">
            <p className="text-[15px] font-semibold text-white">
              {hiding ? 'Updating…' : isHidden ? 'Profile is hidden' : 'Profile is visible'}
            </p>
            <p className="mt-1 text-xs text-white/40">
              {isHidden ? 'You won’t appear in Discover' : 'Showing in Discover for others'}
            </p>
          </div>
          {hiding ? <Spinner className="h-4 w-4 text-brand" /> : <Switch on={!isHidden} />}
        </button>
      </motion.section>

      {/* Notifications */}
      <motion.section
        className="relative mb-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.45, ease }}
      >
        <h2 className="settings-section-title">Telegram alerts</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Stay notified when you’re away from the app.
        </p>
        <ul className="settings-list mt-5">
          {NOTIFY_ITEMS.map((item) => {
            const on = notify[item.key]
            const saving = savingNotify === item.key
            return (
              <li key={item.key}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleNotify(item.key)}
                  className="settings-row disabled:opacity-50"
                >
                  <span className="text-[15px] font-medium text-white">{item.label}</span>
                  {saving ? <Spinner className="h-4 w-4 text-brand" /> : <Switch on={on} />}
                  <span className="sr-only">
                    {item.label} {on ? 'on' : 'off'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </motion.section>

      {/* Session */}
      <motion.section
        className="relative mb-12"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.45, ease }}
      >
        <button
          type="button"
          disabled={busy && !signingOut}
          onClick={() => void signOut()}
          className="settings-text-action disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.8} aria-hidden />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>

        <button
          type="button"
          disabled={busy && !deleting}
          onClick={() => void deleteAccount()}
          className="settings-text-action settings-text-danger mt-4 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.8} aria-hidden />
          {deleting ? 'Deleting account…' : 'Delete account'}
        </button>
      </motion.section>

      <footer className="relative mb-2 flex items-center justify-center gap-2.5 opacity-55">
        <img src="/mingle_251_icon.png" alt="" className="h-7 w-7 object-contain" draggable={false} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{BRAND_NAME}</span>
      </footer>

      {deleting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm text-center">
            <Spinner className="mx-auto h-8 w-8 text-red-300" />
            <p className="mt-5 font-display text-2xl text-white">Deleting account</p>
            <p className="mt-2 text-sm text-muted">Removing your data from {BRAND_NAME}…</p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
