<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WebApp from '@twa-dev/sdk'
import { ChevronLeft, Rocket, CreditCard, ImageOff, Check } from 'lucide-vue-next'
import TgStar from '@/components/ui/TgStar.vue'
import { backend } from '@/api/cars.service'
import { formatPrice } from '@/utils/format'
import { useTelegram } from '@/composables/useTelegram'

defineOptions({ name: 'PayView' })

const route = useRoute()
const router = useRouter()
const { notify, haptic } = useTelegram()
const inTelegram = !!WebApp.initData && typeof WebApp.openInvoice === 'function'

const orderId = Number(route.params.orderId)
const loading = ref(true)
const error = ref('')
const order = ref<backend.OrderStatusResponse | null>(null)
const paying = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})

const days = computed(() => {
  const h = order.value?.duration_hours ?? 0
  return Math.round(h / 24)
})

async function checkOrderCompleted(): Promise<boolean> {
  if (!order.value) return false
  if (order.value.status === 'completed') return true
  try {
    const s = await backend.getOrderStatus(orderId)
    order.value = s
    return s.status === 'completed'
  } catch {
    return false
  }
}

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(async () => {
    if (await checkOrderCompleted()) {
      clearInterval(pollTimer!)
      pollTimer = null
      error.value = ''
      notify('success')
    }
  }, 2000)
}

interface CarInfo {
  title: string
  photo: string
  price: number
}
const car = ref<CarInfo>({ title: '', photo: '', price: 0 })

function goBack() {
  haptic('light')
  router.back()
}

function goToListings() {
  router.push({ name: 'listings', query: { tab: 'active' } })
}

async function load() {
  try {
    order.value = await backend.getOrderStatus(orderId)
    if (order.value) {
      try {
        const detail = await backend.getCarDetail(order.value.target_id)
        car.value = {
          title: `${detail.brand_name} ${detail.model_name}`.trim(),
          photo: detail.photos?.[0]?.url ?? '',
          price: detail.price,
        }
      } catch {
        /* car not available */
      }
    }
  } catch {
    error.value = 'Заказ не найден'
  } finally {
    loading.value = false
  }
}

async function payStars() {
  if (!order.value || paying.value) return
  haptic('medium')
  paying.value = true
  error.value = ''
  try {
    const { invoice_url } = await backend.getStarsInvoice(order.value.order_id)
    if (inTelegram) {
      WebApp.openInvoice(invoice_url, (status: string) => {
        paying.value = false
        if (status === 'paid') {
          order.value = { ...order.value!, status: 'completed' }
          notify('success')
        } else if (status === 'failed') {
          error.value = 'Оплата не прошла — попробуйте ещё раз'
        }
        startPolling()
      })
    } else {
      window.open(invoice_url, '_blank')
      paying.value = false
      startPolling()
    }
  } catch (e) {
    paying.value = false
    const msg = e instanceof Error ? e.message : ''
    error.value = /load failed|failed to fetch|abort|networkerror/i.test(msg)
      ? 'Не удалось связаться с сервером. Проверьте интернет и попробуйте снова.'
      : 'Не удалось создать счёт на оплату'
  }
}

function payCard() {
  haptic('light')
  error.value = 'Оплата картой будет доступна в ближайшее время'
}

onMounted(load)
</script>

<template>
  <main class="min-h-dvh bg-bg">
    <!-- Header -->
    <header class="sticky top-0 z-30 flex items-center gap-2 bg-bg/90 px-2 py-3 backdrop-blur-xl safe-top">
      <button
        type="button"
        aria-label="Назад"
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text transition-transform duration-fast ease-out-ios active:scale-90"
        @click="goBack"
      >
        <ChevronLeft :size="24" />
      </button>
      <h1 class="text-[17px] font-semibold text-text">Оплата</h1>
    </header>

    <div class="mx-auto max-w-md px-4 pt-3">
      <!-- Loading -->
      <div v-if="loading" class="space-y-3 pt-6">
        <div class="h-[92px] w-full animate-pulse rounded-2xl bg-surface" />
        <div class="mx-auto h-3.5 w-48 animate-pulse rounded bg-surface" />
        <div class="mt-6 h-[68px] w-full animate-pulse rounded-2xl bg-surface" />
        <div class="h-[68px] w-full animate-pulse rounded-2xl bg-surface" />
      </div>

      <!-- Success -->
      <div v-else-if="order && order.status === 'completed'" class="flex flex-col items-center pt-16 text-center">
        <div class="flex h-20 w-20 items-center justify-center rounded-full bg-text">
          <Check :size="40" :stroke-width="2.4" class="text-bg" />
        </div>
        <h2 class="mt-5 text-[22px] font-bold text-text">Оплачено</h2>
        <p class="mt-2 text-[14px] leading-snug text-text-muted">
          Объявление поднято в топ{{ days ? ` на ${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}` : '' }}
        </p>
        <button
          type="button"
          class="mt-8 w-full rounded-pill bg-text py-3.5 text-[15px] font-semibold text-bg transition-transform duration-fast ease-out-ios active:scale-[0.98]"
          @click="goToListings"
        >
          Мои объявления
        </button>
      </div>

      <!-- Payment -->
      <template v-else-if="order">
        <!-- Car summary -->
        <div class="flex items-center gap-3 rounded-2xl bg-surface p-3">
          <div class="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-surface-2">
            <img v-if="car.photo" :src="car.photo" :alt="car.title" class="h-full w-full object-cover" />
            <div v-else class="flex h-full w-full items-center justify-center text-text-faint">
              <ImageOff :size="20" :stroke-width="1.6" />
            </div>
          </div>
          <div class="flex min-w-0 flex-1 flex-col justify-center">
            <p class="truncate text-[15px] font-semibold text-text">{{ car.title || 'Объявление' }}</p>
            <p v-if="car.price" class="mt-0.5 text-[15px] font-bold text-text">{{ formatPrice(car.price) }}</p>
            <p class="mt-0.5 flex items-center gap-1.5 text-[12px] text-text-muted">
              <Rocket :size="13" :stroke-width="2" /> {{ order.variant_name }}
            </p>
          </div>
        </div>

        <p class="mt-4 text-center text-[13px] text-text-muted">
          Поднятие в топ ленты и поиска{{ days ? ` на ${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}` : '' }}
        </p>

        <p class="mb-3 mt-6 text-[13px] font-medium uppercase tracking-wide text-text-faint">
          Способ оплаты
        </p>

        <div class="space-y-2.5">
          <!-- Telegram Stars -->
          <button
            type="button"
            :disabled="paying"
            class="flex w-full items-center gap-3.5 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-transform duration-fast active:scale-[0.99] disabled:opacity-50"
            @click="payStars"
          >
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2">
              <TgStar :size="24" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-[15px] font-semibold text-text">Telegram Stars</span>
              <span class="flex items-center gap-1 text-[12px] text-text-muted">
                {{ order.price_stars }} <TgStar :size="12" />
                <template v-if="!inTelegram"> · откроется Telegram</template>
              </span>
            </span>
            <span
              v-if="paying"
              class="h-5 w-5 animate-spin rounded-full border-2 border-text border-t-transparent"
            />
          </button>

          <!-- Bank card -->
          <button
            type="button"
            :disabled="paying"
            class="flex w-full items-center gap-3.5 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-transform duration-fast active:scale-[0.99] disabled:opacity-50"
            @click="payCard"
          >
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-text-muted">
              <CreditCard :size="22" :stroke-width="1.8" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-[15px] font-semibold text-text">Банковская карта</span>
              <span class="block text-[12px] text-text-muted">{{ order.price_rub }} ₽</span>
            </span>
          </button>

          <p v-if="error" class="pt-1 text-center text-[13px] leading-snug text-like">{{ error }}</p>
        </div>
      </template>

      <!-- Error / not found -->
      <p v-else class="pt-20 text-center text-[14px] text-text-muted">{{ error || 'Заказ не найден' }}</p>
    </div>
  </main>
</template>
