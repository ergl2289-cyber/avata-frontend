<script setup lang="ts">
/**
 * Badge for a boosted (paid-pinned) listing. Shows «Поднято» with a small
 * remaining-time hint derived from `boosted_until`. Hidden when not boosted.
 */
import { computed } from 'vue'
import { Rocket } from 'lucide-vue-next'

const props = defineProps<{
  boosted?: boolean
  until?: string | null
  /** Icon-only chip (for tight overlays). */
  compact?: boolean
}>()

const active = computed(() => {
  if (!props.boosted) return false
  if (!props.until) return true
  return new Date(props.until).getTime() > Date.now()
})

const remaining = computed(() => {
  if (!props.until) return ''
  const ms = new Date(props.until).getTime() - Date.now()
  if (ms <= 0) return ''
  const hours = Math.ceil(ms / 3_600_000)
  return hours >= 24 ? `${Math.ceil(hours / 24)} д` : `${hours} ч`
})
</script>

<template>
  <span
    v-if="active"
    class="inline-flex items-center gap-1 rounded-pill bg-text px-2 py-0.5 text-[11px] font-semibold text-bg shadow-sm"
  >
    <Rocket :size="12" :stroke-width="2.2" />
    <template v-if="!compact">
      Поднято<template v-if="remaining"> · {{ remaining }}</template>
    </template>
  </span>
</template>
