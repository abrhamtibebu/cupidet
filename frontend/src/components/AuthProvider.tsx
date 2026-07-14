import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setToken } from '../lib/api'
import { disconnectEcho } from '../lib/echo'
import { AuthContext } from '../lib/auth'
import { getTelegramInitData, getTelegramUserUnsafe, isInsideTelegram } from '../lib/telegram'
import type { User } from '../types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [loading, setLoading] = useState(true)

  const setSession = useCallback((token: string, nextUser: User, complete: boolean) => {
    setToken(token)
    setUser(nextUser)
    setOnboardingComplete(complete)
  }, [])

  const logout = useCallback(() => {
    void api.logout().catch(() => undefined)
    disconnectEcho()
    setToken(null)
    setUser(null)
    setOnboardingComplete(false)
  }, [])

  const refresh = useCallback(async () => {
    const res = await api.me()
    setUser(res.user as User)
    setOnboardingComplete(res.onboarding_complete)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const existing = localStorage.getItem('cupid_token')
        if (existing) {
          await refresh()
          return
        }

        // Steps 8–9: signed initData → POST /api/auth/telegram → Sanctum token
        const initData = getTelegramInitData()
        if (initData) {
          const unsafe = getTelegramUserUnsafe()
          if (unsafe) {
            console.log('Telegram user (display only):', unsafe.first_name, unsafe.id)
          }
          const res = await api.authTelegram(initData)
          if (!cancelled) setSession(res.token, res.user as User, res.onboarding_complete)
          return
        }

        if (isInsideTelegram()) {
          console.warn('Inside Telegram but initData is empty — open via the bot menu button.')
        }
        // Browser/local: wait for Sign in / Sign up screen (no auto-login)
      } catch (err) {
        console.error(err)
        setToken(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refresh, setSession])

  const value = useMemo(
    () => ({ user, onboardingComplete, loading, refresh, setSession, logout }),
    [user, onboardingComplete, loading, refresh, setSession, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
