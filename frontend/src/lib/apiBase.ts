const PRODUCTION_API_URL = 'https://cupidet.onrender.com/api'

function isBareOnrenderHost(hostname: string) {
  return hostname === 'onrender.com' || hostname === 'www.onrender.com'
}

/** Normalized Laravel API base ending in `/api` (no trailing slash beyond that). */
export function getApiUrl(): string {
  const fallback = import.meta.env.PROD ? PRODUCTION_API_URL : 'http://127.0.0.1:8001/api'
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || fallback
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  const normalized = withProtocol.replace(/\/+$/, '')
  let apiUrl = /\/api$/i.test(normalized) ? normalized : `${normalized}/api`

  try {
    const host = new URL(apiUrl).hostname
    // Bare onrender.com is Render's marketing site — never a valid API host
    if (isBareOnrenderHost(host)) {
      console.error(
        `[cupid] VITE_API_URL was "${raw}" (bare onrender.com). Using ${PRODUCTION_API_URL} instead.`,
      )
      apiUrl = PRODUCTION_API_URL
    }
  } catch {
    console.error('[cupid] Invalid VITE_API_URL:', raw, '— falling back to', fallback)
    apiUrl = fallback
  }

  return apiUrl
}

/** Origin of the API (scheme + host), without `/api`. */
export function getApiOrigin(): string {
  return getApiUrl().replace(/\/api$/i, '')
}
