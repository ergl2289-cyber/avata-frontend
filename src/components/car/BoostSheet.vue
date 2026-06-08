<script setup lang="ts">
/**
 * «Поднять объявление» — pick a boost tariff and pay with Telegram Stars.
 * Flow: getBoostProducts → createBoostOrder → getStarsInvoice → WebApp.openInvoice.
 */
import { ref, watch } from 'vue'
import WebApp from '@twa-dev/sdk'
import { Rocket } from 'lucide-vue-next'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { backend } from '@/api/cars.service'
import { useTelegram } from '@/composables/useTelegram'

const props = withDefaults(
  defineProps<{
    open: boolean
    carId: number | null
    /** Sheet title (default «Поднять объявление»). */
    title?: string
    /** Intro line under the title. */
    subtitle?: string
    /** Show a «Может быть позже» skip button (post-publish offer). */
    skippable?: boolean
  }>(),
  { title: 'Поднять объявление', subtitle: 'Объявление будет показываться первым в ленте и поиске', skippable: false },
)
const emit = defineEmits<{ 'update:open': [v: boolean]; boosted: []; skip: [] }>()

const { haptic, notify } = useTelegram()

function skip() {
  haptic('light')
  emit('skip')
  emit('update:open', false)
}

const plans = ref<backend.BoostProduct[]>([])
const loading = ref(false)
const paying = ref<number | null>(null) // variant id being processed
const error = ref('')

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return
    error.value = ''
    if (plans.value.length) return
    loading.value = true
    try {
      plans.value = await backend.getBoostProducts()
    } catch {
      error.value = 'Не удалось загрузить тарифы'
    } finally {
      loading.value = false
    }
  },
)

function durationLabel(hours: number): string {
  const days = Math.round(hours / 24)
  if (days < 1) return `${hours} ч`
  const word = days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'
  return `${days} ${word}`
}

async function choose(plan: backend.BoostProduct) {
  if (props.carId == null || paying.value != null) return
  haptic('medium')
  paying.value = plan.id
  error.value = ''
  try {
    const order = await backend.createBoostOrder(props.carId, plan.id)
    const { invoice_url } = await backend.getStarsInvoice(order.order_id)
    WebApp.openInvoice(invoice_url, (status: string) => {
      paying.value = null
      if (status === 'paid') {
        notify('success')
        emit('boosted')
        emit('update:open', false)
      } else if (status === 'failed') {
        error.value = 'Оплата не прошла'
      }
      // 'cancelled' / 'pending' → just reset
    })
  } catch (e) {
    paying.value = null
    error.value = e instanceof Error ? e.message : 'Не удалось создать заказ'
  }
}
</script>

<template>
  <BottomSheet :open="open" :title="title" @update:open="emit('update:open', $event)">
    <p class="-mt-1 mb-3 text-center text-[13px] leading-snug text-text-muted">
      {{ subtitle }}
    </p>

    <div v-if="loading" class="space-y-2.5 pb-2">
      <div v-for="n in 3" :key="n" class="h-[58px] animate-pulse rounded-xl bg-surface-2" />
    </div>

    <p v-else-if="error && !plans.length" class="py-8 text-center text-[14px] text-text-muted">
      {{ error }}
    </p>

    <div v-else class="space-y-2.5 pb-2">
      <button
        v-for="p in plans"
        :key="p.id"
        type="button"
        :disabled="paying != null"
        class="flex w-full items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3 text-left transition-transform duration-fast active:scale-[0.99] disabled:opacity-50"
        @click="choose(p)"
      >
        <span class="flex items-center gap-3">
          <Rocket :size="18" class="shrink-0 text-text" />
          <span>
            <span class="block text-[15px] font-semibold text-text">{{ p.name }}</span>
            <span class="block text-[12px] text-text-muted">{{ durationLabel(p.duration_hours) }}</span>
          </span>
        </span>
        <span class="shrink-0 text-right">
          <span class="block text-[15px] font-bold text-text">{{ p.price_stars }} ★</span>
          <span class="block text-[11px] text-text-faint">{{ p.price_rub }} ₽</span>
        </span>
      </button>
      <p v-if="error" class="pt-1 text-center text-[13px] text-like">{{ error }}</p>

      <button
        v-if="skippable"
        type="button"
        :disabled="paying != null"
        class="mt-1 w-full py-2.5 text-center text-[14px] font-medium text-text-muted transition-colors active:text-text disabled:opacity-50"
        @click="skip"
      >
        Может быть позже
      </button>
    </div>
  </BottomSheet>
</template>
