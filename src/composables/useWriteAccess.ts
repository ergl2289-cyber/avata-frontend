import WebApp from '@twa-dev/sdk'

/**
 * Telegram bots can't message a user until that user has granted the bot
 * permission (started the chat). For Mini Apps the native way to obtain it is
 * `WebApp.requestWriteAccess()` — a system popup «Allow the bot to message you?».
 * Granting it lets our notification bot (same token as the Mini App bot) deliver
 * push messages later. No backend call is needed: Telegram enforces the
 * permission at send time and the worker messages `users.tg_id` directly.
 */
const ASKED_KEY = 'avata:write-access-asked'

// Loosely-typed access to fields/methods not present in older @twa-dev typings.
const wa = WebApp as unknown as {
  initData?: string
  initDataUnsafe?: { user?: { allows_write_to_pm?: boolean } }
  requestWriteAccess?: (cb?: (granted: boolean) => void) => void
}

export function useWriteAccess() {
  /** Bot API 7.10+: the bot can already DM this user. */
  function alreadyAllowed(): boolean {
    try {
      return wa.initDataUnsafe?.user?.allows_write_to_pm === true
    } catch {
      return false
    }
  }

  function inTelegram(): boolean {
    try {
      return !!wa.initData
    } catch {
      return false
    }
  }

  function wasAsked(): boolean {
    try {
      return localStorage.getItem(ASKED_KEY) === '1'
    } catch {
      return false
    }
  }

  function markAsked() {
    try {
      localStorage.setItem(ASKED_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  /** Native «Allow the bot to message you?» popup. Resolves to whether granted. */
  function requestWriteAccess(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (typeof wa.requestWriteAccess === 'function') {
          wa.requestWriteAccess((granted: boolean) => resolve(!!granted))
        } else {
          resolve(false)
        }
      } catch {
        resolve(false)
      }
    })
  }

  /** Show the one-time opt-in prompt only in Telegram, when not yet allowed/asked. */
  function shouldPrompt(): boolean {
    return inTelegram() && !alreadyAllowed() && !wasAsked()
  }

  return { alreadyAllowed, inTelegram, wasAsked, markAsked, requestWriteAccess, shouldPrompt }
}
