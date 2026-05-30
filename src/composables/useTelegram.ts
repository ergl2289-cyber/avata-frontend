import WebApp from '@twa-dev/sdk'

export type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'

/**
 * Thin wrapper over the Telegram WebApp SDK. All haptics are guarded so the app
 * runs fine in a plain browser during development (they simply no-op).
 */
export function useTelegram() {
  const tg = WebApp

  function haptic(style: ImpactStyle = 'light') {
    try {
      tg.HapticFeedback?.impactOccurred(style)
    } catch {
      /* not in Telegram — ignore */
    }
  }

  function selection() {
    try {
      tg.HapticFeedback?.selectionChanged()
    } catch {
      /* ignore */
    }
  }

  function notify(type: 'success' | 'warning' | 'error') {
    try {
      tg.HapticFeedback?.notificationOccurred(type)
    } catch {
      /* ignore */
    }
  }

  /** Open a Telegram chat with a seller by username (used on listing screen). */
  function openSellerChat(username: string | null) {
    if (!username) return
    try {
      tg.openTelegramLink(`https://t.me/${username}`)
    } catch {
      window.open(`https://t.me/${username}`, '_blank')
    }
  }

  return { tg, haptic, selection, notify, openSellerChat }
}
