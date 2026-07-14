/** True when opened via Telegram / cloudflared (not local Vite). */
export function isRemoteClient() {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host !== 'localhost' && host !== '127.0.0.1'
}

/** Slower polls over Cloudflare quick tunnels to cut round-trips. */
export function pollMs(localMs: number, remoteMs: number) {
  return isRemoteClient() ? remoteMs : localMs
}
