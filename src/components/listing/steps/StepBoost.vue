<script setup lang="ts">
import { computed } from 'vue'
import { TrendingUp, Eye, Zap, Check } from 'lucide-vue-next'
import TgStar from '@/components/ui/TgStar.vue'
import type { ListingForm } from '@/types/listing'
import { BOOST_TARIFFS } from '@/api/backend'
import { useTelegram } from '@/composables/useTelegram'

const props = defineProps<{ form: ListingForm }>()
const { selection } = useTelegram()

const tariff = computed(() => BOOST_TARIFFS[0])
const days = computed(() => Math.round(tariff.value.duration_hours / 24))

function choose(value: boolean) {
  if (props.form.boost === value) return
  selection()
  props.form.boost = value
}
</script>

<template>
  <div>
    <!-- Benefits — single calm gray card -->
    <div class="space-y-3.5 rounded-2xl bg-surface px-4 py-4">
      <div class="flex items-center gap-3">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-muted">
          <TrendingUp :size="16" :stroke-width="2" />
        </span>
        <p class="text-[14px] text-text">В числе первых в ленте и поиске</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-muted">
          <Eye :size="16" :stroke-width="2" />
        </span>
        <p class="text-[14px] text-text">До 8× больше просмотров</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-muted">
          <Zap :size="16" :stroke-width="2" />
        </span>
        <p class="text-[14px] text-text">Быстрее находят покупатели</p>
      </div>
    </div>

    <!-- Choice -->
    <div class="mt-4 space-y-2.5">
      <!-- Boost option -->
      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors duration-fast"
        :class="form.boost ? 'border-text/70 bg-surface-2' : 'border-transparent bg-surface'"
        @click="choose(true)"
      >
        <span
          class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
          :class="form.boost ? 'border-text bg-text text-bg' : 'border-text-faint'"
        >
          <Check v-if="form.boost" :size="13" :stroke-width="3" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-2">
            <span class="text-[15px] font-semibold text-text">Поднять в топ</span>
            <span class="rounded-pill bg-surface px-2 py-0.5 text-[10px] font-medium text-text-muted">
              советуем
            </span>
          </span>
          <span class="mt-0.5 block text-[13px] text-text-muted">{{ days }} дня в топе</span>
        </span>
        <span class="shrink-0 text-right">
          <span class="flex items-center justify-end gap-1 text-[16px] font-bold text-text">
            {{ tariff.price_stars }} <TgStar :size="15" />
          </span>
          <span class="block text-[12px] text-text-faint">{{ tariff.price_rub }} ₽</span>
        </span>
      </button>

      <!-- Skip option -->
      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors duration-fast"
        :class="!form.boost ? 'border-text/70 bg-surface-2' : 'border-transparent bg-surface'"
        @click="choose(false)"
      >
        <span
          class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
          :class="!form.boost ? 'border-text bg-text text-bg' : 'border-text-faint'"
        >
          <Check v-if="!form.boost" :size="13" :stroke-width="3" />
        </span>
        <span class="text-[15px] font-medium text-text">Без продвижения</span>
      </button>
    </div>

    <p class="mt-4 text-center text-[12px] leading-snug text-text-faint">
      Оплата звёздами Telegram. Продвижение начнётся после одобрения модерацией.
    </p>
  </div>
</template>
