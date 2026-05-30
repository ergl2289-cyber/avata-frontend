<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import SelectField from '@/components/ui/SelectField.vue'
import { getBrands, getModels } from '@/api/catalog.service'
import type { CarBrand, CarModel } from '@/types/car'
import type { ListingForm } from '@/types/listing'

const props = defineProps<{ form: ListingForm }>()

const brands = ref<CarBrand[]>([])
const models = ref<CarModel[]>([])

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
</script>

<template>
  <div class="space-y-4">
    <SelectField v-model="form.brandId" label="Марка">
      <option :value="null">Выберите марку</option>
      <option v-for="b in brands" :key="b.id" :value="b.id">{{ b.name }}</option>
    </SelectField>

    <SelectField v-model="form.modelId" label="Модель" :disabled="!form.brandId">
      <option :value="null">Выберите модель</option>
      <option v-for="m in models" :key="m.id" :value="m.id">{{ m.name }}</option>
    </SelectField>
  </div>
</template>
