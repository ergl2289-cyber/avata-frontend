<script setup lang="ts">
/**
 * Badge for a boosted (paid-pinned) listing. Shows «В топе» with a small
 * remaining-time hint derived from `boosted_until`. Hidden when not boosted.
 * Dark translucent chip — reads well over photos and in status rows.
 */
import { computed } from 'vue'
import { TrendingUp } from 'lucide-vue-next'

const props = defineProps<{
  boosted?: boolean
  until?: string | null
  /** Hide the remaining-time hint (tight rows). */
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
    class="inline-flex items-center gap-1 rounded-pill bg-bg/75 px-2 py-0.5 text-[11px] font-semibold text-text ring-1 ring-white/10 backdrop-blur-sm"
  >
    <TrendingUp :size="12" :stroke-width="2.4" />
    В топе<template v-if="!compact && remaining"> · {{ remaining }}</template>
  </span>
</template>
