import { useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  getTelegramInitData,
  getTelegramUserUnsafe,
  openTelegramMiniApp,
  telegramHaptic,
} from '../lib/telegram'
import { LoadingButton } from '../components/Loading'
import type { User } from '../types'

type Mode = 'signin' | 'signup'

export function AuthPage() {
  const { setSession } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [tgLoading, setTgLoading] = useState(false)
  const [form, setForm] = useState({
    username: '',
    password: '',
    password_confirmation: '',
    first_name: '',
    last_name: '',
  })

  const tgUser = getTelegramUserUnsafe()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res =
        mode === 'signin'
          ? await api.login({ username: form.username.trim(), password: form.password })
          : await api.register({
              username: form.username.trim(),
              password: form.password,
              password_confirmation: form.password_confirmation,
              first_name: form.first_name.trim(),
              last_name: form.last_name.trim() || undefined,
            })
      setSession(res.token, res.user as User, res.onboarding_complete)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const signInWithTelegram = async () => {
    setTgLoading(true)
    setError('')
    try {
      const initData = getTelegramInitData()
      if (!initData) {
        // Browser / no Mini App session — send them into Telegram
        openTelegramMiniApp()
        setError('Open Cupid ET from Telegram to finish signing in.')
        return
      }
      telegramHaptic('medium')
      const res = await api.authTelegram(initData)
      setSession(res.token, res.user as User, res.onboarding_complete)
      telegramHaptic('success')
    } catch (err) {
      telegramHaptic('error')
      setError(err instanceof Error ? err.message : 'Telegram sign in failed')
    } finally {
      setTgLoading(false)
    }
  }

  return (
    <div className="app-shell flex min-h-[100dvh] flex-col justify-center pb-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[22px] bg-lime text-3xl text-ink">
            ♥
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime">Cupid ET</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {mode === 'signin'
              ? 'Sign in to continue discovering matches.'
              : 'Sign up to build your dating profile.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void signInWithTelegram()}
          disabled={tgLoading || loading}
          className="mb-5 flex w-full items-center justify-center gap-3 rounded-full bg-[#229ED9] px-4 py-3.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {tgLoading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
              </svg>
              Connecting…
            </span>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8-1.55 7.3c-.12.52-.43.65-.87.4l-2.4-1.77-1.16 1.12c-.13.13-.24.24-.49.24l.17-2.43 4.43-4.01c.19-.17-.04-.27-.3-.1l-5.48 3.45-2.36-.74c-.51-.16-.52-.51.11-.76l9.23-3.56c.43-.16.8.1.67.66z" />
              </svg>
              {tgUser?.first_name
                ? `Continue as ${tgUser.first_name}`
                : 'Sign in with Telegram'}
            </>
          )}
        </button>

        {tgUser && (
          <p className="mb-5 -mt-2 text-center text-xs text-muted">
            We’ll sync your Telegram name{tgUser.photo_url ? ' & photo' : ''}. Confirm your birthday next.
          </p>
        )}

        <div className="mb-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs font-semibold uppercase tracking-wider text-white/35">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-full bg-panel p-1">
          <button
            type="button"
            className={`rounded-full py-2.5 text-sm font-bold ${mode === 'signin' ? 'bg-lime text-ink' : 'text-white/60'}`}
            onClick={() => setMode('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`rounded-full py-2.5 text-sm font-bold ${mode === 'signup' ? 'bg-lime text-ink' : 'text-white/60'}`}
            onClick={() => {
              setMode('signup')
              setForm((prev) => ({
                ...prev,
                username: '',
                password: '',
                password_confirmation: '',
                first_name: '',
                last_name: '',
              }))
            }}
          >
            Sign up
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-2xl bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <form className="space-y-3" onSubmit={(e) => void submit(e)}>
          {mode === 'signup' && (
            <>
              <input
                className="field"
                placeholder="First name"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                required
              />
              <input
                className="field"
                placeholder="Last name (optional)"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </>
          )}
          <input
            className="field"
            placeholder="Username"
            autoComplete="username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <input
            className="field"
            type="password"
            placeholder="Password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={6}
          />
          {mode === 'signup' && (
            <input
              className="field"
              type="password"
              placeholder="Confirm password"
              autoComplete="new-password"
              value={form.password_confirmation}
              onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
              required
              minLength={6}
            />
          )}

          <LoadingButton
            type="submit"
            loading={loading}
            loadingText="Please wait…"
            disabled={tgLoading}
            className="btn-lime w-full justify-center py-3.5"
          >
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </LoadingButton>
        </form>
      </motion.div>
    </div>
  )
}
