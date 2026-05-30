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

  /**
   * Open a Telegram chat with a seller (used on the listing screen).
   * Prefers the public @username link; falls back to a tg://user?id deep link
   * when the seller has no username. No-op if neither is available.
   */
  function openSellerChat(username: string | null, tgId?: string | null) {
    const url = username
      ? `https://t.me/${username}`
      : tgId
        ? `tg://user?id=${tgId}`
        : ''
    if (!url) return
    try {
      tg.openTelegramLink(url)
    } catch {
      window.open(url, '_blank')
    }
  }

  return { tg, haptic, selection, notify, openSellerChat }
}
