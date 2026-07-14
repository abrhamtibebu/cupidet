/** Rewrite local/API storage URLs so Telegram/cloudflare clients can load them via the current API host. */
export function resolveMediaUrl(url?: string | null, fallback = ''): string {
  if (!url) return fallback
  const apiBase = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api').replace(/\/api\/?$/, '')

  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const parsed = new URL(url)
      const isLocal = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost'
      const isStorage = parsed.pathname.startsWith('/storage/')
      // Localhost always needs rewrite; storage paths also rewrite onto current API host
      // so stale tunnel URLs (old trycloudflare host) keep working after tunnels refresh.
      if (isLocal || isStorage) {
        return `${apiBase}${parsed.pathname}${parsed.search}`
      }
      return url
    }
  } catch {
    /* fall through */
  }

  if (url.startsWith('/')) return `${apiBase}${url}`
  return url
}
