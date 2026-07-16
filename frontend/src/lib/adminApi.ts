import { getApiUrl } from './apiBase'

const API_URL = getApiUrl()
const TOKEN_KEY = 'cupid_admin_token'

export type AdminUser = {
  id: number
  name: string
  email: string
}

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAdminToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {})
  const token = getAdminToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  headers.set('Accept', 'application/json')
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(`${API_URL}/admin${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const firstError = data.errors ? Object.values(data.errors).flat()[0] : null
      const message = firstError || data.message || 'Request failed'
      throw new Error(typeof message === 'string' ? message : 'Request failed')
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

export const adminApi = {
  login: (payload: { email: string; password: string }) =>
    request<{ token: string; admin: AdminUser }>('/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  me: () => request<{ admin: AdminUser }>('/me'),
  logout: () => request('/logout', { method: 'POST' }),
  stats: () =>
    request<{
      total_users: number
      active_7d: number
      new_7d: number
      verified_users: number
      matches: number
      likes: number
      pending_photos: number
      open_reports: number
      new_users_today: number
      series: {
        users: { labels: string[]; values: number[] }
        likes: { labels: string[]; values: number[] }
        spark_users: number[]
        spark_active: number[]
        spark_matches: number[]
      }
    }>('/stats'),
  map: () =>
    request<{ points: { lat: number; lng: number; name: string; location: string }[] }>('/map'),
  locations: () =>
    request<{ locations: { name: string; count: number; color: string; percent: number }[] }>(
      '/locations',
    ),
  languages: () =>
    request<{
      languages: { name: string; count: number }[]
      interests: { name: string; count: number }[]
    }>('/languages'),
  activity: () =>
    request<{
      activity: { name: string; text: string; time: string; photo?: string | null }[]
    }>('/activity'),
  messages: () =>
    request<{
      messages: { name: string; preview: string; time: string; photo?: string | null }[]
    }>('/messages'),
  users: (params?: { bucket?: string; q?: string }) => {
    const qs = new URLSearchParams()
    if (params?.bucket) qs.set('bucket', params.bucket)
    if (params?.q) qs.set('q', params.q)
    const suffix = qs.toString() ? `?${qs}` : ''
    return request<{ data: Record<string, unknown>[] }>(`/users${suffix}`)
  },
  updateUser: (id: number, body: { status?: string; verified?: boolean }) =>
    request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  matches: () => request<{ data: Record<string, unknown>[] }>('/matches'),
  photos: (status?: string) =>
    request<{ data: Record<string, unknown>[] }>(
      `/photos${status ? `?status=${encodeURIComponent(status)}` : ''}`,
    ),
  updatePhoto: (id: number, status: string) =>
    request(`/photos/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  verifications: (status?: string) =>
    request<{ data: Record<string, unknown>[] }>(
      `/verifications${status ? `?status=${encodeURIComponent(status)}` : ''}`,
    ),
  updateVerification: (id: number, status: string, notes?: string) =>
    request(`/verifications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),
  reports: (status?: string) =>
    request<{ data: Record<string, unknown>[] }>(
      `/reports${status ? `?status=${encodeURIComponent(status)}` : ''}`,
    ),
  updateReport: (id: number, body: { status?: string; notes?: string }) =>
    request(`/reports/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
}
