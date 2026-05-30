import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Text-like fields that raise the on-screen keyboard when focused. */
function isTextField(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  if (el.tagName === 'TEXTAREA') return true
  if (el.isContentEditable) return true
  if (el.tagName === 'INPUT') {
    const type = (el as HTMLInputElement).type.toLowerCase()
    return !['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'range', 'color', 'image'].includes(
      type,
    )
  }
  return false
}

/**
 * Tracks whether the on-screen keyboard is (likely) open, based on focus of a
 * text field. Used to hide the fixed bottom tab bar so it doesn't ride up above
 * the keyboard. Debounced on blur so moving between fields doesn't flicker.
 */
export function useKeyboardOpen() {
  const open = ref(false)
  let closeTimer: ReturnType<typeof setTimeout> | null = null

  function onFocusIn(e: FocusEvent) {
    if (isTextField(e.target)) {
      if (closeTimer) clearTimeout(closeTimer)
      open.value = true
    }
  }
  function onFocusOut() {
    if (closeTimer) clearTimeout(closeTimer)
    closeTimer = setTimeout(() => (open.value = false), 60)
  }

  onMounted(() => {
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('focusin', onFocusIn)
    document.removeEventListener('focusout', onFocusOut)
    if (closeTimer) clearTimeout(closeTimer)
  })

  return { open }
}
