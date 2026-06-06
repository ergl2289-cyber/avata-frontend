<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import SelectField from '@/components/ui/SelectField.vue'
import { getCities } from '@/api/geo.service'
import { useProfileStore } from '@/stores/profile'
import type { City } from '@/types/car'
import type { ListingForm } from '@/types/listing'

const props = defineProps<{ form: ListingForm }>()
const profile = useProfileStore()

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
  // Default to the user's own city so the listing lands in their region (the feed
  // and search are region-scoped — a foreign-region listing wouldn't show up).
  if (props.form.cityId == null && profile.cityId != null) {
    props.form.cityId = profile.cityId
  }
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
