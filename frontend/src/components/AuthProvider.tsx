import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, api, getToken, setToken } from '../lib/api'
import { disconnectEcho } from '../lib/echo'
import { AuthContext, restrictionFromMessage, type AccountRestriction } from '../lib/auth'
import { getTelegramInitData, getTelegramStartParam, getTelegramUserUnsafe, isInsideTelegram } from '../lib/telegram'
import type { User } from '../types'

function isAuthFailure(err: unknown): boolean {
  return err instanceof ApiError && (err.httpStatus === 401 || err.httpStatus === 403)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [loading, setLoading] = useState(true)
  const [accountRestriction, setAccountRestriction] = useState<AccountRestriction | null>(null)

  const setSession = useCallback((token: string, nextUser: User, complete: boolean) => {
    setToken(token)
    setUser(nextUser)
    setOnboardingComplete(complete)
    if (nextUser.status === 'banned' || nextUser.status === 'suspended') {
      setAccountRestriction(nextUser.status)
    } else {
      setAccountRestriction(null)
    }
  }, [])

  const clearAccountRestriction = useCallback(() => {
    setAccountRestriction(null)
  }, [])

  const logout = useCallback(() => {
    void api.logout().catch(() => undefined)
    disconnectEcho()
    setToken(null)
    setUser(null)
    setOnboardingComplete(false)
    setAccountRestriction(null)
  }, [])

  const refresh = useCallback(async () => {
    const res = await api.me()
    const nextUser = res.user as User
    setUser(nextUser)
    setOnboardingComplete(res.onboarding_complete)
    if (nextUser.status === 'banned' || nextUser.status === 'suspended') {
      setAccountRestriction(nextUser.status)
    } else {
      setAccountRestriction(null)
    }
  }, [])

  const trackBroadcastOpenIfNeeded = useCallback(async () => {
    const startParam = getTelegramStartParam()
    if (!startParam || !startParam.startsWith('bc')) return
    const key = `cupid_tracked_${startParam}`
    if (sessionStorage.getItem(key)) return
    if (!getToken()) return
    try {
      await api.trackBroadcastOpen(startParam)
      sessionStorage.setItem(key, '1')
    } catch {
      /* non-blocking */
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const existing = localStorage.getItem('cupid_token')
        if (existing) {
          await refresh()
          await trackBroadcastOpenIfNeeded()
          return
        }

        const initData = getTelegramInitData()
        if (initData) {
          const unsafe = getTelegramUserUnsafe()
          if (unsafe) {
            console.log('Telegram user (display only):', unsafe.first_name, unsafe.id)
          }
          const res = await api.authTelegram(initData)
          if (!cancelled) setSession(res.token, res.user as User, res.onboarding_complete)
          await trackBroadcastOpenIfNeeded()
          return
        }

        if (isInsideTelegram()) {
          console.warn('Inside Telegram but initData is empty — open via the bot menu button.')
        }
      } catch (err) {
        console.error(err)
        // Keep the token on transient failures (429 / timeout / 5xx) so chat polling
        // doesn't wipe the session. Only clear on real auth / restriction failures.
        if (isAuthFailure(err) || restrictionFromMessage(err instanceof Error ? err.message : '')) {
          setToken(null)
        }
        const restriction = restrictionFromMessage(err instanceof Error ? err.message : '')
        if (!cancelled && restriction) setAccountRestriction(restriction)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refresh, setSession, trackBroadcastOpenIfNeeded])

  useEffect(() => {
    function clearSession(err?: unknown) {
      setToken(null)
      setUser(null)
      setOnboardingComplete(false)
      const restriction = restrictionFromMessage(err instanceof Error ? err.message : '')
      if (restriction) setAccountRestriction(restriction)
    }

    function syncRestricted() {
      if (!localStorage.getItem('cupid_token')) return
      void refresh().catch((err) => {
        if (isAuthFailure(err) || restrictionFromMessage(err instanceof Error ? err.message : '')) {
          clearSession(err)
        }
      })
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') syncRestricted()
    }

    window.addEventListener('cupid:account-restricted', syncRestricted)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('cupid:account-restricted', syncRestricted)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refresh])

  const value = useMemo(
    () => ({
      user,
      onboardingComplete,
      loading,
      accountRestriction,
      refresh,
      setSession,
      setAccountRestriction,
      clearAccountRestriction,
      logout,
    }),
    [
      user,
      onboardingComplete,
      loading,
      accountRestriction,
      refresh,
      setSession,
      clearAccountRestriction,
      logout,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
