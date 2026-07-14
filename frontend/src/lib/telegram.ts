import {
  init,
  isTMA,
  retrieveRawInitData,
  miniApp,
  viewport,
  themeParams,
  backButton,
  hapticFeedback,
  openTelegramLink as sdkOpenTelegramLink,
} from '@telegram-apps/sdk-react'

export type TelegramUnsafeUser = {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
  is_premium?: boolean
}

type LegacyWebApp = {
  initData?: string
  initDataUnsafe?: { user?: TelegramUnsafeUser }
  themeParams?: Record<string, string>
  ready?: () => void
  expand?: () => void
  MainButton?: {
    setText: (text: string) => void
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
    offClick: (cb: () => void) => void
  }
  BackButton?: {
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
    offClick: (cb: () => void) => void
  }
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
    selectionChanged: () => void
  }
  openTelegramLink?: (url: string) => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
}

function getLegacyWebApp(): LegacyWebApp | undefined {
  return (window as unknown as { Telegram?: { WebApp?: LegacyWebApp } }).Telegram?.WebApp
}

let initialized = false
let insideTelegram = false

/**
 * Initialize Telegram Mini App SDK + legacy WebApp bridge.
 * Safe to call outside Telegram (no-op / returns false).
 */
export function initTelegram(): boolean {
  if (initialized) return insideTelegram
  initialized = true

  const webApp = getLegacyWebApp()
  if (webApp) {
    try {
      webApp.ready?.()
      webApp.expand?.()
      insideTelegram = Boolean(webApp.initData) || Boolean(webApp.initDataUnsafe?.user)
      if (insideTelegram) console.log('Running inside Telegram')
    } catch {
      /* ignore */
    }
  }

  try {
    if (isTMA()) {
      insideTelegram = true
      init()

      if (miniApp.mountSync.isAvailable()) {
        miniApp.mountSync()
      } else if (miniApp.mount.isAvailable()) {
        void miniApp.mount()
      }

      if (themeParams.mountSync.isAvailable()) {
        themeParams.mountSync()
      } else if (themeParams.mount.isAvailable()) {
        void themeParams.mount()
      }

      if (viewport.mount.isAvailable()) {
        void viewport.mount().then(() => {
          if (viewport.expand.isAvailable()) viewport.expand()
          if (viewport.bindCssVars.isAvailable()) viewport.bindCssVars()
        })
      }

      if (miniApp.ready.isAvailable()) miniApp.ready()
      if (miniApp.bindCssVars.isAvailable()) miniApp.bindCssVars()
      if (themeParams.bindCssVars.isAvailable()) themeParams.bindCssVars()

      if (backButton.isSupported() && backButton.mount.isAvailable()) {
        backButton.mount()
      }

      // Align Telegram chrome with Cupid ET brand
      if (miniApp.setHeaderColor.isAvailable()) miniApp.setHeaderColor('#0b0b0b')
      if (miniApp.setBackgroundColor.isAvailable()) miniApp.setBackgroundColor('#000000')
      if (miniApp.setBottomBarColor.isAvailable()) miniApp.setBottomBarColor('#000000')

      console.log('Telegram Mini Apps SDK initialized')
    }
  } catch (err) {
    console.warn('Telegram SDK init skipped:', err)
  }

  applyTelegramThemeVars()
  return insideTelegram
}

export function isInsideTelegram(): boolean {
  if (insideTelegram) return true
  const webApp = getLegacyWebApp()
  return Boolean(webApp?.initData) || isTMA()
}

/** Signed initData string for POST /api/auth/telegram — never trust alone for display-only use. */
export function getTelegramInitData(): string | null {
  try {
    const fromSdk = retrieveRawInitData()
    if (fromSdk) return fromSdk
  } catch {
    /* not in TMA / not initialized */
  }
  const legacy = getLegacyWebApp()?.initData
  return legacy || null
}

/** Unsafe client user — display only, not auth. */
export function getTelegramUserUnsafe(): TelegramUnsafeUser | null {
  return getLegacyWebApp()?.initDataUnsafe?.user ?? null
}

export function getTelegramThemeParams(): Record<string, string> {
  return getLegacyWebApp()?.themeParams ?? {}
}

function applyTelegramThemeVars() {
  const theme = getTelegramThemeParams()
  const root = document.documentElement
  for (const [key, value] of Object.entries(theme)) {
    if (typeof value === 'string' && value) {
      root.style.setProperty(`--tg-${key.replace(/_/g, '-')}`, value)
    }
  }
}

export function telegramHaptic(
  kind: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection' = 'medium',
) {
  try {
    if (kind === 'selection') {
      if (hapticFeedback.selectionChanged.isAvailable()) {
        hapticFeedback.selectionChanged()
        return
      }
      getLegacyWebApp()?.HapticFeedback?.selectionChanged()
      return
    }
    if (kind === 'success' || kind === 'error' || kind === 'warning') {
      if (hapticFeedback.notificationOccurred.isAvailable()) {
        hapticFeedback.notificationOccurred(kind)
        return
      }
      getLegacyWebApp()?.HapticFeedback?.notificationOccurred(kind)
      return
    }
    if (hapticFeedback.impactOccurred.isAvailable()) {
      hapticFeedback.impactOccurred(kind)
      return
    }
    getLegacyWebApp()?.HapticFeedback?.impactOccurred(kind)
  } catch {
    /* ignore outside Telegram */
  }
}

export function openTelegramChat(username: string) {
  const handle = username.replace(/^@/, '')
  if (!handle) return
  const url = `https://t.me/${handle}`
  try {
    if (sdkOpenTelegramLink.isAvailable()) {
      sdkOpenTelegramLink(url)
      return
    }
  } catch {
    /* fall through */
  }
  getLegacyWebApp()?.openTelegramLink?.(url) ?? window.open(url, '_blank')
}

type BackHandler = () => void
let backHandler: BackHandler | null = null
let legacyBackBound: BackHandler | null = null

export function showTelegramBackButton(onClick: BackHandler) {
  backHandler = onClick

  try {
    if (backButton.isSupported() && backButton.show.isAvailable()) {
      backButton.onClick(onClick)
      backButton.show()
      return
    }
  } catch {
    /* fall through */
  }

  const bb = getLegacyWebApp()?.BackButton
  if (!bb) return
  if (legacyBackBound) bb.offClick(legacyBackBound)
  legacyBackBound = onClick
  bb.onClick(onClick)
  bb.show()
}

export function hideTelegramBackButton() {
  try {
    if (backHandler && backButton.offClick.isAvailable()) {
      backButton.offClick(backHandler)
    }
    if (backButton.hide.isAvailable()) backButton.hide()
  } catch {
    /* ignore */
  }
  const bb = getLegacyWebApp()?.BackButton
  if (bb && legacyBackBound) {
    bb.offClick(legacyBackBound)
    bb.hide()
  }
  backHandler = null
  legacyBackBound = null
}

export function getTelegramBotUsername(): string {
  return (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined)?.replace(/^@/, '') || 'cupidet_bot'
}

/** Open the Mini App via the bot (browser fallback for Sign in with Telegram). */
export function openTelegramMiniApp() {
  const bot = getTelegramBotUsername()
  const url = `https://t.me/${bot}?startapp`
  try {
    if (sdkOpenTelegramLink.isAvailable()) {
      sdkOpenTelegramLink(url)
      return
    }
  } catch {
    /* fall through */
  }
  getLegacyWebApp()?.openTelegramLink?.(url) ?? window.open(url, '_blank', 'noopener,noreferrer')
}

