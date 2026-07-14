import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api } from './api'
import { useAuth } from './auth'
import { pollMs } from './perf'

type NavBadges = {
  unreadMessages: number
  newLikes: number
  refreshBadges: () => Promise<void>
}

const NavBadgeContext = createContext<NavBadges>({
  unreadMessages: 0,
  newLikes: 0,
  refreshBadges: async () => undefined,
})

export function NavBadgeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [newLikes, setNewLikes] = useState(0)
  const inFlight = useRef(false)

  const refreshBadges = useCallback(async () => {
    if (!user) {
      setUnreadMessages(0)
      setNewLikes(0)
      return
    }
    if (inFlight.current) return
    inFlight.current = true
    try {
      const res = await api.badges()
      setUnreadMessages(res.unread_messages || 0)
      setNewLikes(res.new_likes || 0)
    } catch {
      /* keep last counts */
    } finally {
      inFlight.current = false
    }
  }, [user])

  useEffect(() => {
    void refreshBadges()
    if (!user) return
    const timer = window.setInterval(() => void refreshBadges(), pollMs(12000, 25000))
    return () => window.clearInterval(timer)
  }, [user, refreshBadges])

  const value = useMemo(
    () => ({ unreadMessages, newLikes, refreshBadges }),
    [unreadMessages, newLikes, refreshBadges],
  )

  return <NavBadgeContext.Provider value={value}>{children}</NavBadgeContext.Provider>
}

export function useNavBadges() {
  return useContext(NavBadgeContext)
}
