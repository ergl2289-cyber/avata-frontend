<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { getBrands, getModels } from '@/api/catalog.service'
import { getCities } from '@/api/geo.service'
import { useFiltersStore } from '@/stores/filters'
import { useTelegram } from '@/composables/useTelegram'
import type { CarBrand, CarModel, City } from '@/types/car'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; apply: [] }>()

const filtersStore = useFiltersStore()
const { haptic } = useTelegram()

const brands = ref<CarBrand[]>([])
const models = ref<CarModel[]>([])
const cities = ref<City[]>([])

// local draft so changes only commit on "Показать"
const draft = reactive({
  brandId: null as number | null,
  modelId: null as number | null,
  yearFrom: null as number | null,
  yearTo: null as number | null,
  priceFrom: null as number | null,
  priceTo: null as number | null,
  cityId: null as number | null,
})

// group cities by region for the two-level regions; loose cities go ungrouped
const cityGroups = computed(() => {
  const groups: { region: string; items: City[] }[] = []
  const loose: City[] = []
  for (const c of cities.value) {
    if (c.region) {
      const g = groups.find((x) => x.region === c.region!.name)
      if (g) g.items.push(c)
      else groups.push({ region: c.region.name, items: [c] })
    } else {
      loose.push(c)
    }
  }
  return { groups, loose }
})

async function ensureData() {
  if (!brands.value.length) brands.value = (await getBrands()).data
  if (!cities.value.length) cities.value = (await getCities()).data
  await loadModels()
}

async function loadModels() {
  models.value = draft.brandId ? (await getModels(draft.brandId)).data : []
}

function syncDraft() {
  const f = filtersStore.filters
  draft.brandId = f.brandId ?? null
  draft.modelId = f.modelId ?? null
  draft.yearFrom = f.yearFrom ?? null
  draft.yearTo = f.yearTo ?? null
  draft.priceFrom = f.priceFrom ?? null
  draft.priceTo = f.priceTo ?? null
  draft.cityId = f.cityId ?? null
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      syncDraft()
      ensureData()
    }
  },
  { immediate: true },
)

// reset model when brand changes
watch(
  () => draft.brandId,
  () => {
    draft.modelId = null
    loadModels()
  },
)

function onReset() {
  haptic('soft')
  draft.brandId = null
  draft.modelId = null
  draft.yearFrom = null
  draft.yearTo = null
  draft.priceFrom = null
  draft.priceTo = null
  draft.cityId = null
}

function onApply() {
  haptic('medium')
  filtersStore.apply({ ...draft })
  emit('apply')
  emit('update:open', false)
}
</script>

<template>
  <BottomSheet :open="open" title="Фильтры" @update:open="emit('update:open', $event)">
    <div class="space-y-4 pb-2">
      <!-- Brand -->
      <label class="block">
        <span class="mb-1.5 block text-[13px] text-text-muted">Марка</span>
        <div class="relative">
          <select
            v-model.number="draft.brandId"
            class="w-full appearance-none rounded-xl bg-surface-2 px-4 py-3 text-[15px] text-text outline-none"
          >
            <option :value="null">Любая</option>
            <option v-for="b in brands" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
          <ChevronDown :size="18" class="pointer-events-none absolute right-3 top-3.5 text-text-muted" />
        </div>
      </label>

      <!-- Model -->
      <label class="block">
        <span class="mb-1.5 block text-[13px] text-text-muted">Модель</span>
        <div class="relative">
          <select
            v-model.number="draft.modelId"
            :disabled="!draft.brandId"
            class="w-full appearance-none rounded-xl bg-surface-2 px-4 py-3 text-[15px] text-text outline-none disabled:opacity-40"
          >
            <option :value="null">Любая</option>
            <option v-for="m in models" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
          <ChevronDown :size="18" class="pointer-events-none absolute right-3 top-3.5 text-text-muted" />
        </div>
      </label>

      <!-- Year range -->
      <div>
        <span class="mb-1.5 block text-[13px] text-text-muted">Год выпуска</span>
        <div class="flex gap-3">
          <input
            v-model.number="draft.yearFrom"
            type="number"
            inputmode="numeric"
            placeholder="от"
            class="w-full rounded-xl bg-surface-2 px-4 py-3 text-[15px] text-text placeholder:text-text-faint outline-none"
          />
          <input
            v-model.number="draft.yearTo"
            type="number"
            inputmode="numeric"
            placeholder="до"
            class="w-full rounded-xl bg-surface-2 px-4 py-3 text-[15px] text-text placeholder:text-text-faint outline-none"
          />
        </div>
      </div>

      <!-- Price range -->
      <div>
        <span class="mb-1.5 block text-[13px] text-text-muted">Цена, ₽</span>
        <div class="flex gap-3">
          <input
            v-model.number="draft.priceFrom"
            type="number"
            inputmode="numeric"
            placeholder="от"
            class="w-full rounded-xl bg-surface-2 px-4 py-3 text-[15px] text-text placeholder:text-text-faint outline-none"
          />
          <input
            v-model.number="draft.priceTo"
            type="number"
            inputmode="numeric"
            placeholder="до"
            class="w-full rounded-xl bg-surface-2 px-4 py-3 text-[15px] text-text placeholder:text-text-faint outline-none"
          />
        </div>
      </div>

      <!-- City -->
      <label class="block">
        <span class="mb-1.5 block text-[13px] text-text-muted">Город</span>
        <div class="relative">
          <select
            v-model.number="draft.cityId"
            class="w-full appearance-none rounded-xl bg-surface-2 px-4 py-3 text-[15px] text-text outline-none"
          >
            <option :value="null">Любой</option>
            <optgroup
              v-for="g in cityGroups.groups"
              :key="g.region"
              :label="g.region"
            >
              <option v-for="c in g.items" :key="c.id" :value="c.id">{{ c.name }}</option>
            </optgroup>
            <option v-for="c in cityGroups.loose" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <ChevronDown :size="18" class="pointer-events-none absolute right-3 top-3.5 text-text-muted" />
        </div>
      </label>

      <button
        type="button"
        class="w-full pt-1 text-center text-[14px] text-text-muted transition-colors active:text-text"
        @click="onReset"
      >
        Сбросить фильтры
      </button>
    </div>

    <template #footer>
      <button
        type="button"
        class="w-full rounded-xl bg-text py-3.5 text-[15px] font-semibold text-bg transition-transform duration-fast ease-out-ios active:scale-[0.98]"
        @click="onApply"
      >
        Показать объявления
      </button>
    </template>
  </BottomSheet>
</template>
