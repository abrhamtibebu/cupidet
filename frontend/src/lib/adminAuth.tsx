import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { adminApi, getAdminToken, setAdminToken, type AdminUser } from './adminApi'

type AdminAuthState = {
  loading: boolean
  admin: AdminUser | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthState | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [admin, setAdmin] = useState<AdminUser | null>(null)

  const refresh = useCallback(async () => {
    const token = getAdminToken()
    if (!token) {
      setAdmin(null)
      return
    }
    const res = await adminApi.me()
    setAdmin(res.admin)
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        if (getAdminToken()) await refresh()
      } catch {
        setAdminToken(null)
        if (alive) setAdmin(null)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const res = await adminApi.login({ email, password })
    setAdminToken(res.token)
    setAdmin(res.admin)
  }, [])

  const logout = useCallback(async () => {
    try {
      await adminApi.logout()
    } catch {
      /* ignore */
    }
    setAdminToken(null)
    setAdmin(null)
  }, [])

  const value = useMemo(
    () => ({ loading, admin, login, logout, refresh }),
    [loading, admin, login, logout, refresh],
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return ctx
}
