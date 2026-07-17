/** Live Laravel API on Render (backend service, not the static frontend). */
const PRODUCTION_API_URL = 'https://cupidet.onrender.com/api'

let cachedApiUrl: string | null = null
let warnedInvalidApiUrl = false

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
  if (cachedApiUrl) return cachedApiUrl

  if (import.meta.env.PROD) {
    const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
    if (raw) {
      try {
        const candidate = normalizeApiUrl(raw)
        if (isUsableApiHost(new URL(candidate).hostname)) {
          cachedApiUrl = candidate
          return cachedApiUrl
        }
        if (!warnedInvalidApiUrl) {
          warnedInvalidApiUrl = true
          console.error(`[cupid] Ignoring invalid VITE_API_URL "${raw}". Using ${PRODUCTION_API_URL}.`)
        }
      } catch {
        if (!warnedInvalidApiUrl) {
          warnedInvalidApiUrl = true
          console.error(`[cupid] Ignoring invalid VITE_API_URL "${raw}". Using ${PRODUCTION_API_URL}.`)
        }
      }
    }
    cachedApiUrl = PRODUCTION_API_URL
    return cachedApiUrl
  }

  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || 'http://127.0.0.1:8001/api'
  cachedApiUrl = normalizeApiUrl(raw)
  return cachedApiUrl
}

/** Origin of the API (scheme + host), without `/api`. */
export function getApiOrigin(): string {
  return getApiUrl().replace(/\/api$/i, '')
}
