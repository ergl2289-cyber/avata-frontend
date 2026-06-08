<script setup lang="ts">
/**
 * «Поднять объявление» — pick a boost tariff and pay with Telegram Stars.
 * Flow: getBoostProducts → createBoostOrder → getStarsInvoice → WebApp.openInvoice.
 */
import { computed, ref, watch } from 'vue'
import WebApp from '@twa-dev/sdk'
import { Rocket, TrendingUp, Eye, Zap, Check } from 'lucide-vue-next'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { backend } from '@/api/cars.service'
import { useTelegram } from '@/composables/useTelegram'

const props = withDefaults(
  defineProps<{
    open: boolean
    carId: number | null
    title?: string
    subtitle?: string
    /** Show a «Может быть позже» skip button (post-publish offer). */
    skippable?: boolean
  }>(),
  {
    title: 'Поднять в топ',
    subtitle: 'Объявление будет одним из первых в ленте и поиске',
    skippable: false,
  },
)
const emit = defineEmits<{ 'update:open': [v: boolean]; boosted: []; skip: [] }>()

const { haptic, notify, selection } = useTelegram()

const plans = ref<backend.BoostProduct[]>([])
const loading = ref(false)
const paying = ref(false)
const error = ref('')
const selectedId = ref<number | null>(null)

const selected = computed(() => plans.value.find((p) => p.id === selectedId.value) ?? null)

async function loadPlans() {
  error.value = ''
  loading.value = true
  try {
    plans.value = await backend.getBoostProducts()
    if (plans.value.length && selectedId.value == null) selectedId.value = plans.value[0].id
  } catch {
    error.value = 'Не удалось загрузить тарифы'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    error.value = ''
    if (!plans.value.length) void loadPlans()
    else if (selectedId.value == null) selectedId.value = plans.value[0].id
  },
)

function durationLabel(hours: number): string {
  const days = Math.round(hours / 24)
  if (days < 1) return `${hours} ч`
  const word = days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'
  return `${days} ${word}`
}

function pick(id: number) {
  if (selectedId.value === id) return
  selection()
  selectedId.value = id
}

function skip() {
  haptic('light')
  emit('skip')
  emit('update:open', false)
}

async function pay() {
  const plan = selected.value
  if (props.carId == null || plan == null || paying.value) return
  haptic('medium')
  paying.value = true
  error.value = ''
  try {
    const order = await backend.createBoostOrder(props.carId, plan.id)
    const { invoice_url } = await backend.getStarsInvoice(order.order_id)
    if (typeof WebApp.openInvoice !== 'function') {
      paying.value = false
      error.value = 'Оплата звёздами доступна только в приложении Telegram'
      return
    }
    WebApp.openInvoice(invoice_url, (status: string) => {
      paying.value = false
      if (status === 'paid') {
        notify('success')
        emit('boosted')
        emit('update:open', false)
      } else if (status === 'failed') {
        error.value = 'Оплата не прошла. Попробуйте ещё раз.'
      }
      // 'cancelled' / 'pending' → silently allow retry
    })
  } catch (e) {
    paying.value = false
    const msg = e instanceof Error ? e.message : ''
    // Network-level fetch rejection in WebKit surfaces as «Load failed».
    error.value = /load failed|failed to fetch|networkerror/i.test(msg)
      ? 'Не удалось связаться с сервером. Проверьте интернет и попробуйте снова.'
      : 'Не удалось создать заказ. Попробуйте ещё раз.'
  }
}
</script>

<template>
  <BottomSheet :open="open" :title="title" @update:open="emit('update:open', $event)">
    <!-- Hero -->
    <div class="flex flex-col items-center pb-1 text-center">
      <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-text">
        <Rocket :size="26" :stroke-width="2" class="text-bg" />
      </div>
      <p class="mt-3 text-[14px] leading-snug text-text-muted">{{ subtitle }}</p>
    </div>

    <!-- Benefits -->
    <div class="mt-5 space-y-2.5">
      <div class="flex items-center gap-3">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text">
          <TrendingUp :size="16" :stroke-width="2" />
        </span>
        <p class="text-[14px] text-text">В числе первых в ленте и поиске</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text">
          <Eye :size="16" :stroke-width="2" />
        </span>
        <p class="text-[14px] text-text">До 8× больше просмотров</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text">
          <Zap :size="16" :stroke-width="2" />
        </span>
        <p class="text-[14px] text-text">Быстрее находят покупатели</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="mt-5 space-y-2.5">
      <div v-for="n in 1" :key="n" class="h-[64px] animate-pulse rounded-2xl bg-surface-2" />
    </div>

    <!-- Failed to load tariffs -->
    <div v-else-if="!plans.length" class="mt-6 text-center">
      <p class="text-[14px] text-text-muted">{{ error || 'Тарифы недоступны' }}</p>
      <button
        type="button"
        class="mt-3 rounded-pill bg-surface-2 px-5 py-2 text-[14px] font-medium text-text active:scale-95"
        @click="loadPlans"
      >
        Повторить
      </button>
    </div>

    <!-- Tariffs -->
    <template v-else>
      <div class="mt-5 space-y-2.5">
        <button
          v-for="p in plans"
          :key="p.id"
          type="button"
          class="flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-colors duration-fast"
          :class="selectedId === p.id ? 'border-text bg-surface' : 'border-border bg-surface/40'"
          @click="pick(p.id)"
        >
          <span
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
            :class="selectedId === p.id ? 'border-text bg-text text-bg' : 'border-border'"
          >
            <Check v-if="selectedId === p.id" :size="14" :stroke-width="3" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-[15px] font-semibold text-text">{{ p.name }}</span>
            <span class="block text-[12px] text-text-muted">{{ durationLabel(p.duration_hours) }} в топе</span>
          </span>
          <span class="shrink-0 text-right">
            <span class="block text-[16px] font-bold text-text">{{ p.price_stars }} ★</span>
            <span class="block text-[11px] text-text-faint">{{ p.price_rub }} ₽</span>
          </span>
        </button>
      </div>

      <p v-if="error" class="mt-3 text-center text-[13px] leading-snug text-like">{{ error }}</p>
    </template>

    <template v-if="plans.length" #footer>
      <button
        type="button"
        :disabled="paying || selected == null"
        class="flex w-full items-center justify-center gap-2 rounded-pill bg-text py-3.5 text-[16px] font-semibold text-bg transition-transform duration-fast ease-out-ios active:scale-[0.98] disabled:opacity-50"
        @click="pay"
      >
        <Rocket v-if="!paying" :size="18" :stroke-width="2.2" />
        {{ paying ? 'Открываем оплату…' : selected ? `Оплатить ${selected.price_stars} ★` : 'Оплатить' }}
      </button>
      <button
        v-if="skippable"
        type="button"
        :disabled="paying"
        class="mt-1 w-full py-2.5 text-center text-[14px] font-medium text-text-muted transition-colors active:text-text disabled:opacity-50"
        @click="skip"
      >
        Может быть позже
      </button>
    </template>
  </BottomSheet>
</template>
