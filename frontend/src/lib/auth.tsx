import { createContext, useContext } from 'react'
import type { User } from '../types'

export type AccountRestriction = 'banned' | 'suspended'

export type AuthState = {
  user: User | null
  onboardingComplete: boolean
  loading: boolean
  accountRestriction: AccountRestriction | null
  refresh: () => Promise<void>
  setSession: (token: string, user: User, onboardingComplete: boolean) => void
  setAccountRestriction: (status: AccountRestriction | null) => void
  clearAccountRestriction: () => void
  logout: () => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function restrictionFromMessage(message: string): AccountRestriction | null {
  const lower = message.toLowerCase()
  if (lower.includes('banned')) return 'banned'
  if (lower.includes('suspended')) return 'suspended'
  return null
}
