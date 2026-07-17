import type { DiscoverCard } from '../types'
import { getApiUrl } from './apiBase'

const API_URL = getApiUrl()

export function getToken(): string | null {
  return localStorage.getItem('cupid_token')
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('cupid_token', token)
  else localStorage.removeItem('cupid_token')
}

export class ApiError extends Error {
  code?: string
  accountStatus?: string
  httpStatus: number

  constructor(message: string, httpStatus: number, code?: string, accountStatus?: string) {
    super(message)
    this.name = 'ApiError'
    this.httpStatus = httpStatus
    this.code = code
    this.accountStatus = accountStatus
  }
}

async function request<T>(path: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 30000, ...fetchOptions } = options
  const headers = new Headers(fetchOptions.headers || {})
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (!(fetchOptions.body instanceof FormData)) {
    headers.set('Accept', 'application/json')
    if (fetchOptions.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
  } else {
    headers.set('Accept', 'application/json')
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const firstError = data.errors ? Object.values(data.errors).flat()[0] : null
      const message = firstError || data.message || 'Request failed'
      const code = typeof data.code === 'string' ? data.code : undefined
      const accountStatus = typeof data.status === 'string' ? data.status : undefined

      if (code === 'account_restricted') {
        window.dispatchEvent(
          new CustomEvent('cupid:account-restricted', {
            detail: { status: accountStatus, message },
          }),
        )
      }

      throw new ApiError(
        typeof message === 'string' ? message : 'Request failed',
        res.status,
        code,
        accountStatus,
      )
    }
    return data as T
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Server timed out. Check your API tunnel / backend.')
    }
    throw err
  } finally {
    window.clearTimeout(timer)
  }
}
export const api = {
  authTelegram: (initData: string) =>
    request<{ token: string; user: unknown; onboarding_complete: boolean }>('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),
  authMock: (payload: Record<string, unknown>) =>
    request<{ token: string; user: unknown; onboarding_complete: boolean }>('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ mock: true, ...payload }),
    }),
  login: (payload: { username: string; password: string }) =>
    request<{ token: string; user: unknown; onboarding_complete: boolean }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  register: (payload: {
    username: string
    password: string
    password_confirmation: string
    first_name: string
    last_name?: string
  }) =>
    request<{ token: string; user: unknown; onboarding_complete: boolean }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: unknown; onboarding_complete: boolean }>('/me'),
  getProfile: () => request<{ user: unknown; onboarding_complete: boolean }>('/profile'),
  saveProfile: (body: Record<string, unknown>) =>
    request<{ user: unknown; onboarding_complete: boolean }>('/profile', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  interests: () => request<{ interests: { id: number; name: string }[] }>('/interests'),
  promptsCatalog: () =>
    request<{
      prompts: { key: string; label: string }[]
      languages: string[]
      relationship_goals: { id: string; label: string }[]
    }>('/prompts'),
  uploadPhoto: async (file: File, isPrimary = false) => {
    const form = new FormData()
    form.append('photo', file)
    if (isPrimary) form.append('is_primary', '1')
    return request<{ photo: unknown }>('/photos', { method: 'POST', body: form })
  },
  uploadVerificationSelfie: async (file: File) => {
    const form = new FormData()
    form.append('selfie', file)
    return request<{ verification_request: unknown; message: string }>('/verification/selfie', {
      method: 'POST',
      body: form,
    })
  },
  setPrimaryPhoto: (id: number) =>
    request(`/photos/${id}/primary`, { method: 'PUT' }),
  deletePhoto: (id: number) => request(`/photos/${id}`, { method: 'DELETE' }),
  discover: () => request<{ data: unknown[]; can_rewind?: boolean }>('/discover'),
  like: (userId: number, type: 'like' | 'super' = 'like') =>
    request<{ matched: boolean; other_user?: unknown; match?: { id: number } }>('/like', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, type }),
    }),
  pass: (userId: number) =>
    request<{ pass: unknown; can_rewind?: boolean }>('/pass', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),
  rewind: () =>
    request<{ undone: string; user?: DiscoverCard | null; can_rewind?: boolean }>('/rewind', {
      method: 'POST',
    }),
  matches: () => request<{ data: unknown[] }>('/matches'),
  likesReceived: () => request<{ data: unknown[] }>('/likes/received'),
  conversations: () => request<{ data: unknown[] }>('/conversations'),
  badges: () =>
    request<{ unread_messages: number; new_likes: number }>('/badges'),
  getMessages: (matchId: number, opts?: { markSeen?: boolean }) => {
    const mark = opts?.markSeen === false ? '?mark_seen=0' : ''
    return request<{
      data: unknown[]
      settings?: { muted: boolean; upcoming_date?: unknown }
      peer?: unknown
      peer_typing?: boolean
    }>(`/matches/${matchId}/messages${mark}`)
  },
  liveChat: (matchId: number, afterId = 0) =>
    request<{
      messages: unknown[]
      peer_typing: boolean
      statuses: { id: number; delivered_at?: string | null; read_at?: string | null }[]
    }>(`/matches/${matchId}/live?after_id=${afterId}`, { timeoutMs: 20000 }),
  sendMessage: (matchId: number, body: string) =>
    request<{ message: unknown }>(`/matches/${matchId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  typingStatus: (matchId: number) =>
    request<{ typing: boolean }>(`/matches/${matchId}/typing`),
  markDelivered: (matchId: number, messageIds?: number[]) =>
    request<{ data: unknown[] }>(`/matches/${matchId}/delivered`, {
      method: 'POST',
      body: JSON.stringify(messageIds ? { message_ids: messageIds } : {}),
    }),
  markRead: (matchId: number) =>
    request<{ data: unknown[] }>(`/matches/${matchId}/read`, { method: 'POST', body: '{}' }),
  typing: (matchId: number, typing: boolean) =>
    request(`/matches/${matchId}/typing`, {
      method: 'POST',
      body: JSON.stringify({ typing }),
    }),
  presence: (matchId: number) =>
    request(`/matches/${matchId}/presence`, { method: 'POST', body: '{}' }),
  chatSettings: (matchId: number) =>
    request<{ settings: { muted: boolean; upcoming_date?: unknown } }>(`/matches/${matchId}/settings`),
  updateChatSettings: (matchId: number, muted: boolean) =>
    request<{ settings: { muted: boolean; upcoming_date?: unknown } }>(`/matches/${matchId}/settings`, {
      method: 'PATCH',
      body: JSON.stringify({ muted }),
    }),
  proposeDate: (
    matchId: number,
    payload: { scheduled_at: string; place?: string; note?: string },
  ) =>
    request<{ message: unknown; date: unknown }>(`/matches/${matchId}/dates`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  respondDate: (matchId: number, dateId: number, status: 'accepted' | 'declined' | 'cancelled') =>
    request<{ message: unknown; date: unknown }>(`/matches/${matchId}/dates/${dateId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
  unmatch: (matchId: number) =>
    request<{ ok: boolean }>(`/matches/${matchId}`, { method: 'DELETE' }),
  updateNotifications: (prefs: {
    notify_matches?: boolean
    notify_likes?: boolean
    notify_messages?: boolean
  }) =>
    request<{ user: unknown }>('/notifications', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    }),
  sendFeedback: (body: {
    category: 'general' | 'bug' | 'idea' | 'confusing' | 'success'
    rating?: number | null
    message: string
    page?: string
    app_version?: string
  }) =>
    request<{ feedback: { id: number; status: string } }>('/feedback', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  trackBroadcastOpen: (startParam: string) =>
    request<{ ok: boolean }>('/broadcast-opens', {
      method: 'POST',
      body: JSON.stringify({ start_param: startParam }),
    }),
  report: (userId: number, reason: string, details?: string) =>
    request('/report', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, reason, details }),
    }),
  block: (userId: number) =>
    request('/block', { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  hideProfile: () => request<{ status: string }>('/profile/hide', { method: 'POST' }),
  deleteAccount: () => request('/account', { method: 'DELETE' }),
}
