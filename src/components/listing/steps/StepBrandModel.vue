<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import PickerField from '@/components/ui/PickerField.vue'
import OptionPickerSheet from '@/components/ui/OptionPickerSheet.vue'
import { getBrands, getModels } from '@/api/catalog.service'
import type { CarBrand, CarModel } from '@/types/car'
import type { ListingForm } from '@/types/listing'

const props = defineProps<{ form: ListingForm }>()

const brands = ref<CarBrand[]>([])
const models = ref<CarModel[]>([])
const brandOpen = ref(false)
const modelOpen = ref(false)

const brandName = computed(
  () => brands.value.find((b) => b.id === props.form.brandId)?.name ?? null,
)
const modelName = computed(
  () => models.value.find((m) => m.id === props.form.modelId)?.name ?? null,
)

async function loadModels() {
  models.value = props.form.brandId ? (await getModels(props.form.brandId)).data : []
}

onMounted(async () => {
  brands.value = (await getBrands()).data
  await loadModels()
})

// reset model when brand changes
watch(
  () => props.form.brandId,
  (next, prev) => {
    if (prev !== undefined && next !== prev) props.form.modelId = null
    loadModels()
  },
)

function pickBrand(b: { id: number }) {
  props.form.brandId = b.id
}
function pickModel(m: { id: number }) {
  props.form.modelId = m.id
}
function openModel() {
  if (props.form.brandId) modelOpen.value = true
}
</script>

<template>
  <div class="space-y-4">
    <PickerField
      label="Марка"
      placeholder="Выберите марку"
      :value="brandName"
      @open="brandOpen = true"
    />
    <PickerField
      label="Модель"
      placeholder="Выберите модель"
      :value="modelName"
      :disabled="!form.brandId"
      @open="openModel"
    />

    <OptionPickerSheet
      v-model:open="brandOpen"
      title="Выберите марку"
      :options="brands"
      :selected-id="form.brandId"
      @select="pickBrand"
    />
    <OptionPickerSheet
      v-model:open="modelOpen"
      title="Выберите модель"
      :options="models"
      :selected-id="form.modelId"
      @select="pickModel"
    />
  </div>
</template>
