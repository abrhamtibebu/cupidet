import { getApiUrl } from './apiBase'

const API_URL = getApiUrl()
const TOKEN_KEY = 'cupid_admin_token'

export type AdminUser = {
  id: number
  name: string
  email: string
}

export type AdminMeta = {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export type AdminUserRow = {
  id: number
  username: string | null
  name: string | null
  location: string | null
  verified: boolean
  status: string
  last_active: string | null
  created_at: string | null
  photo_url: string | null
}

export type AdminPhotoRow = {
  id: number
  image_url: string
  status: string
  is_primary: boolean
  username: string | null
  name: string | null
  created_at: string | null
}

export type AdminVerificationPhoto = {
  id: number
  image_url: string
  is_primary: boolean
  status: string
}

export type AdminVerificationRow = {
  id: number
  selfie_url: string
  status: string
  notes: string | null
  username: string | null
  name: string | null
  verified: boolean
  created_at: string | null
  reviewed_at: string | null
  photos: AdminVerificationPhoto[]
  primary_photo_url: string | null
}

export type AdminMatchRow = {
  id: number
  user_one: string | null
  user_two: string | null
  messages_count: number
  matched_at: string | null
}

export type AdminReportRow = {
  id: number
  reason: string
  status: string
  details: string | null
  notes: string | null
  reporter: string | null
  reported: string | null
  created_at: string | null
}

export type AdminFeedbackRow = {
  id: number
  category: string
  rating: number | null
  message: string
  page: string | null
  status: string
  notes: string | null
  user: string | null
  username: string | null
  created_at: string | null
  reviewed_at: string | null
}

export type AdminTelegramGroup = {
  id: number
  chat_id: number
  title: string | null
  type: string
  username: string | null
  is_active: boolean
  last_error?: string | null
  joined_at: string | null
  left_at: string | null
  updated_at: string | null
}

export type AdminBreakdown = {
  name: string
  count: number
  color?: string
  percent?: number
}

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAdminToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(path: string, options: RequestInit = {}, timeoutMs = 15000): Promise<T> {
  const headers = new Headers(options.headers || {})
  const token = getAdminToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  headers.set('Accept', 'application/json')
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

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

function qs(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    search.set(key, String(value))
  })
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ''
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
      active_users: number
      active_7d: number
      new_7d: number
      verified_users: number
      matches: number
      likes: number
      pending_photos: number
      pending_verifications: number
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
    request<{
      points: { lat: number; lng: number; name: string; location: string }[]
      meta: { total: number; shown: number }
    }>('/map'),
  locations: () =>
    request<{
      locations: AdminBreakdown[]
      genders: AdminBreakdown[]
      age_bands: AdminBreakdown[]
      relationship_goals: AdminBreakdown[]
    }>('/locations'),
  languages: () =>
    request<{
      languages: { name: string; count: number }[]
      interests: { name: string; count: number }[]
    }>('/languages'),
  activity: () =>
    request<{
      activity: {
        type?: string
        name: string
        text: string
        time: string
        photo?: string | null
      }[]
    }>('/activity'),
  messages: () =>
    request<{
      messages: { name: string; preview: string; time: string; photo?: string | null }[]
    }>('/messages'),
  users: (params?: { bucket?: string; q?: string; page?: number; per_page?: number }) =>
    request<{ data: AdminUserRow[]; meta: AdminMeta }>(`/users${qs(params || {})}`),
  updateUser: (id: number, body: { status?: string; verified?: boolean }) =>
    request<{ user: { id: number; status: string; verified: boolean } }>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  matches: (params?: { page?: number; per_page?: number }) =>
    request<{ data: AdminMatchRow[]; meta: AdminMeta }>(`/matches${qs(params || {})}`),
  photos: (params?: { status?: string; page?: number; per_page?: number }) =>
    request<{ data: AdminPhotoRow[]; meta: AdminMeta }>(`/photos${qs(params || {})}`),
  updatePhoto: (id: number, status: string) =>
    request(`/photos/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  verifications: (params?: { status?: string; page?: number; per_page?: number }) =>
    request<{ data: AdminVerificationRow[]; meta: AdminMeta }>(`/verifications${qs(params || {})}`),
  updateVerification: (id: number, status: string, notes?: string) =>
    request(`/verifications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),
  reports: (params?: { status?: string; page?: number; per_page?: number }) =>
    request<{ data: AdminReportRow[]; meta: AdminMeta }>(`/reports${qs(params || {})}`),
  updateReport: (id: number, body: { status?: string; notes?: string }) =>
    request(`/reports/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  feedback: (params?: { status?: string; category?: string; page?: number; per_page?: number }) =>
    request<{ data: AdminFeedbackRow[]; meta: AdminMeta }>(`/feedback${qs(params || {})}`),
  updateFeedback: (id: number, body: { status?: string; notes?: string }) =>
    request(`/feedback/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  telegramGroups: (params?: { active_only?: boolean }) =>
    request<{ data: AdminTelegramGroup[]; meta: { total: number; active: number } }>(
      `/telegram-groups${qs({ active_only: params?.active_only ? 1 : undefined })}`,
    ),
  updateTelegramGroup: (id: number, is_active: boolean) =>
    request<{ group: { id: number; is_active: boolean } }>(`/telegram-groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    }),
  telegramBroadcast: (payload: {
    messageHtml: string
    messageText?: string
    withAppButton?: boolean
    chatIds?: number[]
    image?: File | null
  }) => {
    const form = new FormData()
    form.append('message', payload.messageHtml || '')
    if (payload.messageText) form.append('message_text', payload.messageText)
    form.append('with_app_button', payload.withAppButton === false ? '0' : '1')
    payload.chatIds?.forEach((id) => form.append('chat_ids[]', String(id)))
    if (payload.image) form.append('image', payload.image)
    return request<{
      queued: boolean
      count: number
      sent?: number
      failed?: number
      has_photo: boolean
      results?: { chat_id: number; title: string | null; ok: boolean; error: string | null }[]
    }>('/telegram-broadcast', { method: 'POST', body: form }, 60000)
  },
}
