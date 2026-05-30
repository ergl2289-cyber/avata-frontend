<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronRight, ChevronLeft, Check } from 'lucide-vue-next'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { getCities } from '@/api/geo.service'
import type { City, Region } from '@/types/car'
import { useTelegram } from '@/composables/useTelegram'

const props = defineProps<{ open: boolean; selectedId: number | null }>()
const emit = defineEmits<{ 'update:open': [v: boolean]; select: [city: City] }>()

const { selection, haptic } = useTelegram()

const cities = ref<City[]>([])
const drill = ref<Region | null>(null)

const regions = computed(() => {
  const map = new Map<number, Region>()
  for (const c of cities.value) if (c.region) map.set(c.region.id, c.region)
  return [...map.values()]
})
const flatCities = computed(() => cities.value.filter((c) => !c.region))
const drilledCities = computed(() =>
  drill.value ? cities.value.filter((c) => c.region?.id === drill.value!.id) : [],
)

const title = computed(() => drill.value?.name ?? 'Выберите город')

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      drill.value = null
      if (!cities.value.length) cities.value = (await getCities()).data
    }
  },
)

function openRegion(r: Region) {
  selection()
  drill.value = r
}
function back() {
  selection()
  drill.value = null
}
function choose(c: City) {
  haptic('light')
  emit('select', c)
  emit('update:open', false)
}
</script>

<template>
  <BottomSheet :open="open" @update:open="emit('update:open', $event)">
    <template #header>
      <div class="relative flex h-7 items-center justify-center">
        <button
          v-if="drill"
          type="button"
          aria-label="Назад"
          class="absolute left-0 flex h-7 w-7 items-center justify-center rounded-full text-text active:scale-90"
          @click="back"
        >
          <ChevronLeft :size="22" />
        </button>
        <h2 class="text-[16px] font-semibold text-text">{{ title }}</h2>
      </div>
    </template>

    <!-- Fixed height keeps the sheet from jumping in size between levels -->
    <div class="no-scrollbar h-[56dvh] overflow-y-auto">
      <Transition :name="drill ? 'level-fwd' : 'level-back'" mode="out-in">
        <div :key="drill ? drill.id : 'root'">
          <!-- Drilled: cities of a region -->
          <template v-if="drill">
            <button
              v-for="c in drilledCities"
              :key="c.id"
              type="button"
              class="flex w-full items-center justify-between border-b border-border/60 py-3.5 text-left active:opacity-70"
              @click="choose(c)"
            >
              <span class="text-[15px] text-text">{{ c.name }}</span>
              <Check v-if="selectedId === c.id" :size="18" class="text-text" />
            </button>
          </template>

          <!-- Top level: regions (drill) + flat cities -->
          <template v-else>
            <button
              v-for="r in regions"
              :key="'r' + r.id"
              type="button"
              class="flex w-full items-center justify-between border-b border-border/60 py-3.5 text-left active:opacity-70"
              @click="openRegion(r)"
            >
              <span class="text-[15px] text-text">{{ r.name }}</span>
              <ChevronRight :size="18" class="text-text-muted" />
            </button>
            <button
              v-for="c in flatCities"
              :key="'c' + c.id"
              type="button"
              class="flex w-full items-center justify-between border-b border-border/60 py-3.5 text-left active:opacity-70"
              @click="choose(c)"
            >
              <span class="text-[15px] text-text">{{ c.name }}</span>
              <Check v-if="selectedId === c.id" :size="18" class="text-text" />
            </button>
          </template>
        </div>
      </Transition>
    </div>
  </BottomSheet>
</template>

<style scoped>
.level-fwd-enter-active,
.level-fwd-leave-active,
.level-back-enter-active,
.level-back-leave-active {
  transition:
    opacity 200ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
}
.level-fwd-enter-from {
  opacity: 0;
  transform: translateX(16px);
}
.level-fwd-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}
.level-back-enter-from {
  opacity: 0;
  transform: translateX(-16px);
}
.level-back-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
</style>

