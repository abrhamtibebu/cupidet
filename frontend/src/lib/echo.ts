import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { getToken } from './api'

declare global {
  interface Window {
    Pusher: typeof Pusher
  }
}

window.Pusher = Pusher

let echoInstance: Echo<'reverb'> | null = null
let echoToken: string | null = null
let echoEndpointKey: string | null = null

const apiBase = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api').replace(/\/api\/?$/, '')

function isLocalHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

/** Local app → local Reverb. Remote (Telegram/cloudflared) → VITE_REVERB_* public tunnel. */
export function resolveReverbEndpoint() {
  const pageHost = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1'

  if (isLocalHost(pageHost)) {
    return { host: '127.0.0.1', port: 8080, scheme: 'http' as const }
  }

  const host = import.meta.env.VITE_REVERB_HOST || ''
  if (!host || isLocalHost(host)) {
    console.warn(
      '[cupid] Remote app needs VITE_REVERB_HOST set to your Reverb cloudflared URL (not 127.0.0.1).',
    )
  }

  return {
    host: host || pageHost,
    port: Number(import.meta.env.VITE_REVERB_PORT || 443),
    scheme: (import.meta.env.VITE_REVERB_SCHEME || 'https') as 'http' | 'https',
  }
}

export function getEcho(): Echo<'reverb'> | null {
  const key = import.meta.env.VITE_REVERB_APP_KEY
  if (!key) return null

  const token = getToken()
  if (!token) return null

  const { host, port, scheme } = resolveReverbEndpoint()
  const endpointKey = `${host}:${port}:${scheme}`

  if (echoInstance && echoToken === token && echoEndpointKey === endpointKey) {
    return echoInstance
  }

  disconnectEcho()

  echoToken = token
  echoEndpointKey = endpointKey
  echoInstance = new Echo({
    broadcaster: 'reverb',
    key,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
    authEndpoint: `${apiBase}/api/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  })

  return echoInstance
}

export function disconnectEcho() {
  try {
    echoInstance?.disconnect()
  } catch {
    /* ignore */
  }
  echoInstance = null
  echoToken = null
  echoEndpointKey = null
}

export function bindConnectionState(onChange: (connected: boolean) => void) {
  const echo = getEcho()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const connection = (echo as any)?.connector?.pusher?.connection
  if (!connection) {
    onChange(false)
    return () => undefined
  }

  const sync = () => onChange(connection.state === 'connected')
  sync()
  connection.bind('connected', sync)
  connection.bind('disconnected', sync)
  connection.bind('unavailable', sync)
  connection.bind('failed', sync)

  return () => {
    connection.unbind('connected', sync)
    connection.unbind('disconnected', sync)
    connection.unbind('unavailable', sync)
    connection.unbind('failed', sync)
  }
}
