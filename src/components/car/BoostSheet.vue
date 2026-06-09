<script setup lang="ts">
/**
 * «Поднять в топ» — pick a boost tariff, create an order, go to /pay/:orderId.
 */
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Check } from 'lucide-vue-next'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import TgStar from '@/components/ui/TgStar.vue'
import { backend } from '@/api/cars.service'
import { useTelegram } from '@/composables/useTelegram'

const props = withDefaults(
  defineProps<{
    open: boolean
    carId: number | null
    title?: string
    subtitle?: string
  }>(),
  {
    title: 'Поднять в топ',
    subtitle: 'Объявление будет одним из первых в ленте и поиске',
  },
)
const emit = defineEmits<{ 'update:open': [v: boolean] }>()

const router = useRouter()
const { haptic, selection } = useTelegram()

const plans = ref<backend.BoostProduct[]>([])
const loading = ref(false)
const creating = ref(false)
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

/** Backend names come prefixed («Поднятие объявления — На 3 дня»); show the short tail. */
function planName(name: string): string {
  const parts = name.split('—')
  return (parts.length > 1 ? parts[parts.length - 1] : name).trim()
}

function pick(id: number) {
  if (selectedId.value === id) return
  selection()
  selectedId.value = id
}

async function proceed() {
  const plan = selected.value
  if (props.carId == null || plan == null || creating.value) return
  haptic('medium')
  creating.value = true
  error.value = ''
  try {
    const order = await backend.createBoostOrder(props.carId, plan.id)
    emit('update:open', false)
    router.push({ name: 'pay', params: { orderId: order.order_id } })
  } catch (e) {
    creating.value = false
    const msg = e instanceof Error ? e.message : ''
    error.value = /load failed|failed to fetch|abort|networkerror/i.test(msg)
      ? 'Не удалось связаться с сервером. Проверьте интернет и попробуйте снова.'
      : 'Не удалось создать заказ. Попробуйте ещё раз.'
  }
}
</script>

<template>
  <BottomSheet :open="open" :title="title" @update:open="emit('update:open', $event)">
    <!-- Intro -->
    <p class="-mt-1 mb-1 text-center text-[14px] leading-snug text-text-muted">{{ subtitle }}</p>

    <!-- Benefits (text only) -->
    <div class="mt-4 space-y-2 rounded-2xl bg-surface px-4 py-3.5">
      <p class="flex items-start gap-2 text-[14px] leading-snug text-text">
        <span class="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-text-muted" />
        В числе первых в ленте и поиске
      </p>
      <p class="flex items-start gap-2 text-[14px] leading-snug text-text">
        <span class="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-text-muted" />
        До 8× больше просмотров
      </p>
      <p class="flex items-start gap-2 text-[14px] leading-snug text-text">
        <span class="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-text-muted" />
        Быстрее находят покупатели
      </p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="mt-5">
      <div class="h-[64px] animate-pulse rounded-2xl bg-surface-2" />
    </div>

    <!-- Failed to load -->
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
      <div class="mt-5 space-y-2">
        <button
          v-for="p in plans"
          :key="p.id"
          type="button"
          class="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors duration-base"
          :class="selectedId === p.id ? 'bg-surface-2' : 'bg-surface/60'"
          @click="pick(p.id)"
        >
          <span
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors"
            :class="selectedId === p.id ? 'bg-text text-bg' : 'bg-surface-2'"
          >
            <Check v-if="selectedId === p.id" :size="12" :stroke-width="3" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-[15px] font-semibold text-text">{{ planName(p.name) }}</span>
            <span class="block text-[12px] text-text-muted">{{ durationLabel(p.duration_hours) }} в топе</span>
          </span>
          <span class="shrink-0 text-right">
            <span class="flex items-center justify-end gap-1 text-[16px] font-bold text-text">
              {{ p.price_stars }} <TgStar :size="15" />
            </span>
            <span class="block text-[11px] text-text-faint">{{ p.price_rub }} ₽</span>
          </span>
        </button>
      </div>

      <p v-if="error" class="mt-3 text-center text-[13px] leading-snug text-like">{{ error }}</p>
    </template>

    <template v-if="plans.length" #footer>
      <button
        type="button"
        :disabled="creating || selected == null"
        class="flex w-full items-center justify-center gap-2 rounded-pill bg-text py-3.5 text-[16px] font-semibold text-bg transition-transform duration-fast ease-out-ios active:scale-[0.98] disabled:opacity-50"
        @click="proceed"
      >
        {{ creating ? 'Создаём заказ…' : 'Перейти к оплате' }}
      </button>
    </template>
  </BottomSheet>
</template>
