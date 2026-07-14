/** Normalized Laravel API base ending in `/api` (no trailing slash beyond that). */
export function getApiUrl(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || 'http://127.0.0.1:8001/api'
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  const normalized = withProtocol.replace(/\/+$/, '')
  const apiUrl = /\/api$/i.test(normalized) ? normalized : `${normalized}/api`

  try {
    const host = new URL(apiUrl).hostname
    // Bare onrender.com is the marketing site — never a valid API host
    if (host === 'onrender.com' || host === 'www.onrender.com') {
      console.error(
        '[cupid] VITE_API_URL points at onrender.com. Set it to your backend service, e.g. https://cupidet.onrender.com/api',
      )
    }
  } catch {
    console.error('[cupid] Invalid VITE_API_URL:', raw)
  }

  return apiUrl
}

/** Origin of the API (scheme + host), without `/api`. */
export function getApiOrigin(): string {
  return getApiUrl().replace(/\/api$/i, '')
}
