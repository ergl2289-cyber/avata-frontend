<script setup lang="ts">
/**
 * Single-level option picker built on the shared BottomSheet (see CLAUDE.md —
 * all sheets go through one component). Replaces native <select> dropdowns so
 * the look is consistent across platforms. Long lists get a live search box.
 * For multi-level use CityPickerSheet.
 */
import { computed, ref, watch } from 'vue'
import { Check, Search } from 'lucide-vue-next'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { useTelegram } from '@/composables/useTelegram'

interface Option {
  id: number
  name: string
}

const props = defineProps<{
  open: boolean
  title?: string
  options: Option[]
  selectedId: number | null
}>()
const emit = defineEmits<{ 'update:open': [v: boolean]; select: [option: Option] }>()

const { haptic } = useTelegram()

const query = ref('')

// Only bother with a search box once the list is long enough to scroll.
const showSearch = computed(() => props.options.length > 6)

/**
 * Ranked search: prefix matches first («au» → Audi before Renault), then
 * word-start matches («ser» → «3 Series»), then any substring. Within the same
 * rank the original order is kept — and since the list arrives popularity-first,
 * the most popular relevant option floats to the top.
 */
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.options
  const scored: { o: Option; s: number; i: number }[] = []
  props.options.forEach((o, i) => {
    const n = o.name.toLowerCase()
    let s = -1
    if (n.startsWith(q)) s = 0
    else if (n.split(/[\s\-/()]+/).some((w) => w.startsWith(q))) s = 1
    else if (n.includes(q)) s = 2
    if (s >= 0) scored.push({ o, s, i })
  })
  scored.sort((a, b) => a.s - b.s || a.i - b.i)
  return scored.map((x) => x.o)
})

// Reset the query each time the sheet (re)opens.
watch(
  () => props.open,
  () => (query.value = ''),
)

function choose(o: Option) {
  haptic('light')
  emit('select', o)
  emit('update:open', false)
}
</script>

<template>
  <BottomSheet :open="open" :title="title" @update:open="emit('update:open', $event)">
    <!-- Live search (sticky) — full-bleed within the sheet's padded scroll area -->
    <div v-if="showSearch" class="sticky top-0 z-10 -mx-5 mb-1 bg-surface px-5 pb-2.5 pt-0.5">
      <div class="relative">
        <Search :size="18" class="pointer-events-none absolute left-3.5 top-3 text-text-muted" />
        <input
          v-model="query"
          type="search"
          enterkeyhint="search"
          placeholder="Поиск"
          class="w-full rounded-pill bg-surface-2 py-2.5 pl-11 pr-4 text-[15px] text-text placeholder:text-text-muted outline-none"
        />
      </div>
    </div>

    <button
      v-for="o in filtered"
      :key="o.id"
      type="button"
      class="flex w-full items-center justify-between border-b border-border/60 py-3.5 text-left active:opacity-70"
      @click="choose(o)"
    >
      <span class="text-[15px] text-text">{{ o.name }}</span>
      <Check v-if="selectedId === o.id" :size="18" class="text-text" />
    </button>

    <p v-if="!filtered.length" class="py-10 text-center text-[14px] text-text-muted">
      Ничего не найдено
    </p>
  </BottomSheet>
</template>
