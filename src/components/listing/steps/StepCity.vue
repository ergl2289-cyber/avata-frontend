<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import SelectField from '@/components/ui/SelectField.vue'
import { getCities } from '@/api/geo.service'
import { useProfileStore } from '@/stores/profile'
import { MOSCOW_ONLY, SINGLE_CITY_NAME } from '@/config'
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
  // Moscow-only launch: no picker, force the single city onto the listing.
  if (MOSCOW_ONLY && profile.cityId != null) {
    props.form.cityId = profile.cityId
  }
})
</script>

<template>
  <!-- Moscow-only launch: city is fixed, show it as a static row (no picker). -->
  <div v-if="MOSCOW_ONLY" class="rounded-xl bg-surface-2 px-4 py-3">
    <span class="mb-0.5 block text-[13px] text-text-muted">Город</span>
    <span class="block text-[15px] text-text">{{ SINGLE_CITY_NAME }}</span>
  </div>
  <SelectField v-else v-model="form.cityId" label="Город">
    <option :value="null">Выберите город</option>
    <option v-for="c in sortedCities" :key="c.id" :value="c.id">{{ c.name }}</option>
  </SelectField>
</template>
