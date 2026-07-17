import { getApiOrigin } from './apiBase'

const PLACEHOLDER = '/mingle_251_icon.png'

function isTelegramBotFileUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.hostname === 'api.telegram.org' && parsed.pathname.includes('/file/bot')
  } catch {
    return false
  }
}

function isStorageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.pathname.startsWith('/storage/')
  } catch {
    return url.startsWith('/storage/')
  }
}

/** True when the URL is safe to render in the client (not a bot-token file URL). */
export function isSafeMediaUrl(url?: string | null): boolean {
  if (!url) return false
  if (isTelegramBotFileUrl(url)) return false
  return true
}

/** Rewrite local/API storage URLs so Telegram/cloudflare clients can load them via the current API host. */
export function resolveMediaUrl(url?: string | null, fallback = ''): string {
  if (!url) return fallback
  const apiBase = getApiOrigin()

  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const parsed = new URL(url)
      const isLocal = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost'
      const isStorage = parsed.pathname.startsWith('/storage/')
      const isMediaProxy = parsed.pathname.startsWith('/api/media/')
      // Localhost /storage / media-proxy paths need the live API host.
      if (isLocal || isStorage || isMediaProxy) {
        return `${apiBase}${parsed.pathname}${parsed.search}`
      }
      // Never render Telegram bot-token file URLs in the client
      if (isTelegramBotFileUrl(url)) {
        return fallback
      }
      return url
    }
  } catch {
    /* fall through */
  }

  if (url.startsWith('/')) return `${apiBase}${url}`
  return url
}

/**
 * Build an ordered list of candidate image URLs (deduped, bot-token stripped).
 * First entry is preferred; later entries are onError fallbacks.
 */
export function mediaCandidates(
  ...urls: Array<string | null | undefined>
): string[] {
  const seen = new Set<string>()
  const out: string[] = []

  for (const raw of urls) {
    if (!raw || !isSafeMediaUrl(raw)) continue
    const resolved = resolveMediaUrl(raw)
    if (!resolved || seen.has(resolved)) continue
    // Prefer non-storage CDN when both exist — handled by caller order
    seen.add(resolved)
    out.push(resolved)
  }

  if (!seen.has(PLACEHOLDER)) {
    out.push(PLACEHOLDER)
  }

  return out
}

export function withCacheBust(url: string): string {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}_r=${Date.now()}`
}

export function isEphemeralStorageCandidate(url: string): boolean {
  return isStorageUrl(url)
}

export { PLACEHOLDER as MEDIA_PLACEHOLDER }
