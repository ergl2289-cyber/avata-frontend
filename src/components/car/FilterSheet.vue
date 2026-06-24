<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import PickerField from '@/components/ui/PickerField.vue'
import OptionPickerSheet from '@/components/ui/OptionPickerSheet.vue'
import { getBrands, getModels } from '@/api/catalog.service'
import { getCities } from '@/api/geo.service'
import { MOSCOW_ONLY } from '@/config'
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

const brandOpen = ref(false)
const modelOpen = ref(false)

// "Любая" sentinel (id 0) so the searchable picker can also clear the filter.
const ANY = { id: 0, name: 'Любая' }
const brandOptions = computed(() => [ANY, ...brands.value])
const modelOptions = computed(() => [ANY, ...models.value])
const brandName = computed(() => brands.value.find((b) => b.id === draft.brandId)?.name ?? null)
const modelName = computed(() => models.value.find((m) => m.id === draft.modelId)?.name ?? null)

function pickBrand(o: { id: number }) {
  draft.brandId = o.id === 0 ? null : o.id
}
function pickModel(o: { id: number }) {
  draft.modelId = o.id === 0 ? null : o.id
}
function openModel() {
  if (draft.brandId) modelOpen.value = true
}

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

// Flat, alphabetically-sorted city list (millionniki — no region grouping).
const sortedCities = computed(() =>
  [...cities.value].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
)

async function ensureData() {
  if (!brands.value.length) brands.value = (await getBrands()).data
  // Moscow-only launch: no city filter, skip loading the city list.
  if (!MOSCOW_ONLY && !cities.value.length) cities.value = (await getCities()).data
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
  const clean: Record<string, number | null> = {}
  for (const [k, v] of Object.entries(draft)) {
    clean[k] = (v as any === '') ? null : v
  }
  filtersStore.apply(clean as any)
  emit('apply')
  emit('update:open', false)
}
</script>

<template>
  <BottomSheet :open="open" title="Фильтры" @update:open="emit('update:open', $event)">
    <div class="space-y-4 pb-2">
      <!-- Brand (searchable picker) -->
      <PickerField
        label="Марка"
        placeholder="Любая"
        :value="brandName"
        bg="surface-2"
        @open="brandOpen = true"
      />

      <!-- Model (searchable picker) -->
      <PickerField
        label="Модель"
        placeholder="Любая"
        :value="modelName"
        :disabled="!draft.brandId"
        bg="surface-2"
        @open="openModel"
      />

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
      <label v-if="!MOSCOW_ONLY" class="block">
        <span class="mb-1.5 block text-[13px] text-text-muted">Город</span>
        <div class="relative">
          <select
            v-model.number="draft.cityId"
            class="w-full appearance-none rounded-xl bg-surface-2 px-4 py-3 text-[15px] text-text outline-none"
          >
            <option :value="null">Любой</option>
            <option v-for="c in sortedCities" :key="c.id" :value="c.id">{{ c.name }}</option>
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

    <!-- Searchable brand/model pickers (teleported above this sheet) -->
    <OptionPickerSheet
      v-model:open="brandOpen"
      title="Марка"
      :options="brandOptions"
      :selected-id="draft.brandId ?? 0"
      @select="pickBrand"
    />
    <OptionPickerSheet
      v-model:open="modelOpen"
      title="Модель"
      :options="modelOptions"
      :selected-id="draft.modelId ?? 0"
      @select="pickModel"
    />

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
