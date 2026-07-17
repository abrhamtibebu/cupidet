import { getApiOrigin } from './apiBase'

/** Rewrite local/API storage URLs so Telegram/cloudflare clients can load them via the current API host. */
export function resolveMediaUrl(url?: string | null, fallback = ''): string {
  if (!url) return fallback
  const apiBase = getApiOrigin()

  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const parsed = new URL(url)
      const isLocal = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost'
      const isStorage = parsed.pathname.startsWith('/storage/')
      // Localhost /storage paths need the live API host. Leave Telegram/CDN URLs untouched.
      if (isLocal || isStorage) {
        return `${apiBase}${parsed.pathname}${parsed.search}`
      }
      // Never render Telegram bot-token file URLs in the client
      if (parsed.hostname === 'api.telegram.org' && parsed.pathname.includes('/file/bot')) {
        return fallback || url
      }
      return url
    }
  } catch {
    /* fall through */
  }

  if (url.startsWith('/')) return `${apiBase}${url}`
  return url
}
