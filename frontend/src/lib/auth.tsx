import { createContext, useContext } from 'react'
import type { User } from '../types'

export type AuthState = {
  user: User | null
  onboardingComplete: boolean
  loading: boolean
  refresh: () => Promise<void>
  setSession: (token: string, user: User, onboardingComplete: boolean) => void
  logout: () => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
