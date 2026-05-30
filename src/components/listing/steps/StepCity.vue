<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import SelectField from '@/components/ui/SelectField.vue'
import { getCities } from '@/api/geo.service'
import type { City } from '@/types/car'
import type { ListingForm } from '@/types/listing'

defineProps<{ form: ListingForm }>()

const cities = ref<City[]>([])

const groups = computed(() => {
  const out: { region: string; items: City[] }[] = []
  const loose: City[] = []
  for (const c of cities.value) {
    if (c.region) {
      const g = out.find((x) => x.region === c.region!.name)
      if (g) g.items.push(c)
      else out.push({ region: c.region.name, items: [c] })
    } else loose.push(c)
  }
  return { regioned: out, loose }
})

onMounted(async () => {
  cities.value = (await getCities()).data
})
</script>

<template>
  <SelectField v-model="form.cityId" label="Город">
    <option :value="null">Выберите город</option>
    <optgroup v-for="g in groups.regioned" :key="g.region" :label="g.region">
      <option v-for="c in g.items" :key="c.id" :value="c.id">{{ c.name }}</option>
    </optgroup>
    <option v-for="c in groups.loose" :key="c.id" :value="c.id">{{ c.name }}</option>
  </SelectField>
</template>
