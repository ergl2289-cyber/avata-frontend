<script setup lang="ts">
/**
 * One-time, gentle opt-in for Telegram push permission. Explains the benefit,
 * then triggers the native requestWriteAccess popup. Never nags: once shown
 * (allowed or not) it won't appear again on this device.
 */
import { onMounted, ref } from 'vue'
import { Bell } from 'lucide-vue-next'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { useWriteAccess } from '@/composables/useWriteAccess'
import { useTelegram } from '@/composables/useTelegram'

const { shouldPrompt, requestWriteAccess, markAsked } = useWriteAccess()
const { haptic, notify } = useTelegram()

const open = ref(false)
const busy = ref(false)

onMounted(() => {
  if (!shouldPrompt()) return
  // Let the app settle before prompting (avoids an abrupt popup on launch).
  setTimeout(() => {
    if (shouldPrompt()) open.value = true
  }, 1500)
})

async function allow() {
  if (busy.value) return
  busy.value = true
  haptic('medium')
  const granted = await requestWriteAccess()
  markAsked()
  busy.value = false
  open.value = false
  if (granted) notify('success')
}

function onToggle(v: boolean) {
  open.value = v
  if (!v) markAsked() // dismissed → don't ask again
}
</script>

<template>
  <BottomSheet :open="open" title="Уведомления" @update:open="onToggle">
    <div class="flex flex-col items-center pb-1 text-center">
      <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2">
        <Bell :size="26" :stroke-width="2" class="text-text" />
      </div>
      <p class="mt-3 text-[14px] leading-snug text-text-muted">
        Разрешите боту присылать сообщения — будем сообщать о новых машинах по вашим
        запросам, ответах на объявления и важных событиях. Без спама.
      </p>
    </div>

    <template #footer>
      <button
        type="button"
        :disabled="busy"
        class="w-full rounded-pill bg-text py-3.5 text-[16px] font-semibold text-bg transition-transform duration-fast ease-out-ios active:scale-[0.98] disabled:opacity-50"
        @click="allow"
      >
        Разрешить
      </button>
      <button
        type="button"
        :disabled="busy"
        class="mt-1 w-full py-2.5 text-center text-[14px] font-medium text-text-muted transition-colors active:text-text disabled:opacity-50"
        @click="onToggle(false)"
      >
        Не сейчас
      </button>
    </template>
  </BottomSheet>
</template>
