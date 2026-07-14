import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { hideTelegramBackButton, isInsideTelegram, showTelegramBackButton } from '../lib/telegram'

const ROOT_PATHS = new Set(['/', '/discover'])

/** Step 12: native Telegram BackButton for nested screens. */
export function TelegramBackButton() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    if (!isInsideTelegram()) return

    const isRoot = ROOT_PATHS.has(pathname)
    if (isRoot) {
      hideTelegramBackButton()
      return
    }

    showTelegramBackButton(() => navigate(-1))
    return () => hideTelegramBackButton()
  }, [pathname, navigate])

  return null
}
