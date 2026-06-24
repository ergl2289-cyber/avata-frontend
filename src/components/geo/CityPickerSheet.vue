<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, Search, X } from 'lucide-vue-next'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { getCities } from '@/api/geo.service'
import type { City } from '@/types/car'
import { useTelegram } from '@/composables/useTelegram'

const props = defineProps<{ open: boolean; selectedId: number | null }>()
const emit = defineEmits<{ 'update:open': [v: boolean]; select: [city: City] }>()

const { haptic } = useTelegram()

const cities = ref<City[]>([])
const query = ref('')

// Flat, searchable list of cities (millionniki). No region/district drill-down.
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = [...cities.value].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  return q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list
})

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      query.value = ''
      if (!cities.value.length) cities.value = (await getCities()).data
    }
  },
)

function choose(c: City) {
  haptic('light')
  emit('select', c)
  emit('update:open', false)
}
</script>

<template>
  <BottomSheet :open="open" title="Выберите город" @update:open="emit('update:open', $event)">
    <!-- Search -->
    <div class="relative mb-2">
      <Search :size="18" class="pointer-events-none absolute left-3.5 top-3 text-text-muted" />
      <input
        v-model="query"
        type="search"
        autocomplete="off"
        autocapitalize="none"
        spellcheck="false"
        placeholder="Поиск города"
        class="w-full rounded-xl bg-surface-2 py-2.5 pl-10 pr-9 text-[15px] text-text placeholder:text-text-muted outline-none"
      />
      <button
        v-if="query"
        type="button"
        aria-label="Очистить"
        class="absolute right-2.5 top-2 flex h-6 w-6 items-center justify-center rounded-full text-text-muted active:scale-90"
        @click="query = ''"
      >
        <X :size="16" />
      </button>
    </div>

    <!-- Fixed height keeps the sheet from jumping as the list filters -->
    <div class="no-scrollbar h-[52dvh] overflow-y-auto">
      <button
        v-for="c in filtered"
        :key="c.id"
        type="button"
        class="flex w-full items-center justify-between border-b border-border/60 py-3.5 text-left active:opacity-70"
        @click="choose(c)"
      >
        <span class="text-[15px] text-text">{{ c.name }}</span>
        <Check v-if="selectedId === c.id" :size="18" class="text-text" />
      </button>
      <p v-if="!filtered.length" class="py-10 text-center text-[14px] text-text-muted">
        Город не найден
      </p>
    </div>
  </BottomSheet>
</template>
