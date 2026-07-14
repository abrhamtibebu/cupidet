import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { telegramHaptic } from '../lib/telegram'
import { BottomNav } from '../components/BottomNav'
import { LoadingButton, Spinner } from '../components/Loading'

type NotifyKey = 'notify_matches' | 'notify_likes' | 'notify_messages'

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

  const toggleHide = async () => {
    setHiding(true)
    setError('')
    setMessage('')
    try {
      const res = await api.hideProfile()
      await refresh()
      telegramHaptic('success')
      setMessage(res.status === 'hidden' ? 'Profile hidden from discovery' : 'Profile is visible again')
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
      setMessage('Notification preference saved')
    } catch (e) {
      telegramHaptic('error')
      setError(e instanceof Error ? e.message : 'Could not update notifications')
    } finally {
      setSavingNotify(null)
    }
  }

  const deleteAccount = async () => {
    if (!window.confirm('Delete your Mingle 251 account permanently? This cannot be undone.')) return
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

  const busy = hiding || deleting || signingOut || savingNotify !== null

  return (
    <div className="app-shell">
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime">Account</p>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </header>

      {message && <p className="mb-4 rounded-2xl bg-lime/15 px-3 py-2 text-sm text-lime">{message}</p>}
      {error && <p className="mb-4 rounded-2xl bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>}

      <div className="space-y-3">
        <div className="rounded-[22px] bg-panel p-4">
          <p className="text-sm text-muted">Signed in as</p>
          <p className="mt-1 font-semibold">@{user?.username || user?.telegram_id}</p>
          <p className="mt-1 text-sm text-muted">Status: {user?.status}</p>
        </div>

        <div className="rounded-[22px] bg-panel p-4">
          <p className="text-sm font-semibold">Notifications</p>
          <p className="mt-1 text-sm text-muted">Telegram alerts when you are away from the app.</p>
          <div className="mt-3 space-y-2">
            {(
              [
                { key: 'notify_matches' as const, label: 'New matches' },
                { key: 'notify_likes' as const, label: 'New likes' },
                { key: 'notify_messages' as const, label: 'New messages' },
              ] as const
            ).map((item) => {
              const on = notify[item.key]
              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleNotify(item.key)}
                  className="flex w-full items-center justify-between rounded-2xl bg-panel-2 px-3 py-3 text-left disabled:opacity-50"
                >
                  <span className="text-sm font-medium">{item.label}</span>
                  <span
                    className={`relative h-7 w-12 rounded-full transition-colors ${on ? 'bg-lime' : 'bg-white/15'}`}
                    aria-hidden
                  >
                    <span
                      className={`absolute top-0.5 h-6 w-6 rounded-full bg-ink transition-transform ${
                        on ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </span>
                  <span className="sr-only">
                    {item.label} {on ? 'on' : 'off'}
                    {savingNotify === item.key ? ', saving' : ''}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <LoadingButton
          loading={hiding}
          loadingText={user?.status === 'hidden' ? 'Unhiding…' : 'Hiding…'}
          disabled={busy && !hiding}
          onClick={() => void toggleHide()}
          className="w-full rounded-[22px] bg-panel px-4 py-4 text-left font-semibold"
        >
          {user?.status === 'hidden' ? 'Unhide profile' : 'Hide profile'}
        </LoadingButton>

        <Link
          to="/profile"
          className={`block w-full rounded-[22px] bg-panel px-4 py-4 font-semibold ${busy ? 'pointer-events-none opacity-50' : ''}`}
        >
          Edit profile & preferences
        </Link>

        <LoadingButton
          loading={signingOut}
          loadingText="Signing out…"
          disabled={busy && !signingOut}
          onClick={() => void signOut()}
          className="w-full rounded-[22px] bg-panel px-4 py-4 text-left font-semibold text-white/80"
        >
          Sign out
        </LoadingButton>

        <LoadingButton
          loading={deleting}
          loadingText="Deleting account…"
          disabled={busy && !deleting}
          onClick={() => void deleteAccount()}
          className="w-full rounded-[22px] bg-red-500/15 px-4 py-4 text-left font-semibold text-red-300"
        >
          Delete account
        </LoadingButton>
      </div>

      {deleting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6">
          <div className="w-full max-w-sm rounded-[24px] bg-panel p-6 text-center">
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
