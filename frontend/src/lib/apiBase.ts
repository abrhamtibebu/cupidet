/** Live Laravel API on Render (backend service, not the static frontend). */
const PRODUCTION_API_URL = 'https://cupidet.onrender.com/api'

function normalizeApiUrl(raw: string): string {
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  const normalized = withProtocol.replace(/\/+$/, '')
  return /\/api$/i.test(normalized) ? normalized : `${normalized}/api`
}

function isUsableApiHost(hostname: string): boolean {
  if (!hostname || hostname === 'onrender.com' || hostname === 'www.onrender.com') return false
  // Frontend static site is not the API
  if (hostname === 'mingle-251.onrender.com') return false
  return true
}

/** Normalized Laravel API base ending in `/api`. */
export function getApiUrl(): string {
  if (import.meta.env.PROD) {
    const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
    if (raw) {
      try {
        const candidate = normalizeApiUrl(raw)
        if (isUsableApiHost(new URL(candidate).hostname)) return candidate
        console.error(`[cupid] Ignoring invalid VITE_API_URL "${raw}". Using ${PRODUCTION_API_URL}.`)
      } catch {
        console.error(`[cupid] Ignoring invalid VITE_API_URL "${raw}". Using ${PRODUCTION_API_URL}.`)
      }
    }
    return PRODUCTION_API_URL
  }

  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || 'http://127.0.0.1:8001/api'
  return normalizeApiUrl(raw)
}

/** Origin of the API (scheme + host), without `/api`. */
export function getApiOrigin(): string {
  return getApiUrl().replace(/\/api$/i, '')
}
