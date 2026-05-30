<script setup lang="ts">
import { computed } from 'vue'
import { Clock, Check, FilePen, Ban } from 'lucide-vue-next'
import type { ModerationStatus } from '@/types/car'
import { moderationLabel } from '@/utils/format'

const props = defineProps<{ status: ModerationStatus }>()

const icon = computed(
  () =>
    ({ draft: FilePen, pending: Clock, approved: Check, rejected: Ban })[props.status] ?? FilePen,
)
const label = computed(() => moderationLabel(props.status))
const emphasized = computed(() => props.status === 'approved')
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-pill bg-surface-2 px-2 py-0.5 text-[12px] font-medium"
    :class="emphasized ? 'text-text' : 'text-text-muted'"
  >
    <component :is="icon" :size="13" :stroke-width="2" />
    {{ label }}
  </span>
</template>
