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

// Flat, alphabetically-sorted city list (millionniki — no region grouping).
const sortedCities = computed(() =>
  [...cities.value].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
)

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
    <option v-for="c in sortedCities" :key="c.id" :value="c.id">{{ c.name }}</option>
  </SelectField>
</template>
