<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Camera, Trash2 } from 'lucide-vue-next'
import type { DraftListing } from '@/types/listing'
import { draftCoverUrl } from '@/stores/myListings'
import { formatListingDate, formatPrice } from '@/utils/format'
import { useTelegram } from '@/composables/useTelegram'
import StatusChip from './StatusChip.vue'

const props = defineProps<{ draft: DraftListing }>()
const emit = defineEmits<{ remove: [id: string] }>()

const router = useRouter()
const { haptic } = useTelegram()

const cover = computed(() => draftCoverUrl(props.draft))
const price = computed(() =>
  props.draft.form.price != null ? formatPrice(props.draft.form.price) : 'Цена не указана',
)

function open() {
  haptic('light')
  router.push({ name: 'post', query: { draft: props.draft.id } })
}
</script>

<template>
  <article
    class="flex cursor-pointer select-none gap-3 transition-transform duration-fast ease-out-ios active:scale-[0.99]"
    @click="open"
  >
    <div class="relative h-24 w-24 shrink-0 overflow-hidden rounded-card bg-surface">
      <img v-if="cover" :src="cover" alt="" loading="lazy" class="h-full w-full object-cover" />
      <div v-else class="flex h-full w-full items-center justify-center text-text-faint">
        <Camera :size="22" :stroke-width="1.6" />
      </div>
    </div>

    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex items-start gap-2">
        <p class="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-text line-clamp-2">
          {{ draft.title }}
        </p>
        <button
          type="button"
          aria-label="Удалить черновик"
          class="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted transition-transform duration-fast ease-out-ios active:scale-90"
          @click.stop.prevent="emit('remove', draft.id)"
        >
          <Trash2 :size="18" :stroke-width="2" />
        </button>
      </div>

      <p
        class="mt-0.5 text-[15px] font-bold leading-none"
        :class="draft.form.price != null ? 'text-text' : 'text-text-faint'"
      >
        {{ price }}
      </p>

      <div class="mt-auto flex items-center gap-3 pt-2">
        <StatusChip status="draft" />
        <span class="text-[12px] text-text-faint">
          изменён {{ formatListingDate(draft.updatedAt) }}
        </span>
      </div>
    </div>
  </article>
</template>
