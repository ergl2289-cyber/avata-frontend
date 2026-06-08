<script setup lang="ts">
import { computed } from 'vue'
import { Rocket, TrendingUp, Eye, Zap, Check } from 'lucide-vue-next'
import type { ListingForm } from '@/types/listing'
import { BOOST_TARIFFS } from '@/api/backend'
import { useTelegram } from '@/composables/useTelegram'

const props = defineProps<{ form: ListingForm }>()
const { selection } = useTelegram()

const tariff = computed(() => BOOST_TARIFFS[0])

function choose(value: boolean) {
  if (props.form.boost === value) return
  selection()
  props.form.boost = value
}
</script>

<template>
  <div>
    <!-- Hero -->
    <div class="flex flex-col items-center text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-text">
        <Rocket :size="30" :stroke-width="2" class="text-bg" />
      </div>
      <h2 class="mt-4 text-[20px] font-bold leading-tight text-text">Продайте быстрее</h2>
      <p class="mt-1.5 text-[14px] leading-snug text-text-muted">
        Поднимите объявление в топ — его увидят в числе первых тысячи покупателей
      </p>
    </div>

    <!-- Benefits -->
    <div class="mt-6 space-y-3">
      <div class="flex items-center gap-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-text">
          <TrendingUp :size="18" :stroke-width="2" />
        </span>
        <p class="text-[14px] text-text">В числе первых в ленте и поиске</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-text">
          <Eye :size="18" :stroke-width="2" />
        </span>
        <p class="text-[14px] text-text">До 8× больше просмотров</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-text">
          <Zap :size="18" :stroke-width="2" />
        </span>
        <p class="text-[14px] text-text">Быстрее находят реальные покупатели</p>
      </div>
    </div>

    <!-- Choice -->
    <div class="mt-7 space-y-3">
      <!-- Boost option -->
      <button
        type="button"
        class="relative flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-colors duration-fast"
        :class="form.boost ? 'border-text bg-surface' : 'border-border bg-surface/40'"
        @click="choose(true)"
      >
        <span
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
          :class="form.boost ? 'border-text bg-text text-bg' : 'border-border'"
        >
          <Check v-if="form.boost" :size="14" :stroke-width="3" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-2">
            <span class="text-[15px] font-semibold text-text">Поднять в топ</span>
            <span class="rounded-pill bg-text px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-bg">
              Хит
            </span>
          </span>
          <span class="mt-0.5 block text-[13px] text-text-muted">На {{ Math.round(tariff.duration_hours / 24) }} дня в топе</span>
        </span>
        <span class="shrink-0 text-right">
          <span class="block text-[16px] font-bold text-text">{{ tariff.price_stars }} ★</span>
          <span class="block text-[12px] text-text-faint">{{ tariff.price_rub }} ₽</span>
        </span>
      </button>

      <!-- Skip option -->
      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-colors duration-fast"
        :class="!form.boost ? 'border-text bg-surface' : 'border-border bg-surface/40'"
        @click="choose(false)"
      >
        <span
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
          :class="!form.boost ? 'border-text bg-text text-bg' : 'border-border'"
        >
          <Check v-if="!form.boost" :size="14" :stroke-width="3" />
        </span>
        <span class="text-[15px] font-medium text-text">Опубликовать без продвижения</span>
      </button>
    </div>

    <p class="mt-4 text-center text-[12px] leading-snug text-text-faint">
      Оплата звёздами Telegram. Продвижение начнётся после одобрения модерацией.
    </p>
  </div>
</template>
