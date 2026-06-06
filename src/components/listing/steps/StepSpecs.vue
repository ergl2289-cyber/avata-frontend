<script setup lang="ts">
import ChipGroup from '@/components/ui/ChipGroup.vue'
import type { ListingForm } from '@/types/listing'
import type { DriveType, FuelType, Transmission } from '@/types/car'

defineProps<{ form: ListingForm }>()

const bodyTypes = ['Седан', 'Хэтчбек', 'Универсал', 'Внедорожник', 'Купе', 'Минивэн', 'Пикап'].map(
  (b) => ({ value: b, label: b }),
)
const transmissions: { value: Transmission; label: string }[] = [
  { value: 'manual', label: 'Механика' },
  { value: 'automatic', label: 'Автомат' },
  { value: 'robot', label: 'Робот' },
  { value: 'cvt', label: 'Вариатор' },
]
const fuels: { value: FuelType; label: string }[] = [
  { value: 'petrol', label: 'Бензин' },
  { value: 'diesel', label: 'Дизель' },
  { value: 'hybrid', label: 'Гибрид' },
  { value: 'electric', label: 'Электро' },
]
const drives: { value: DriveType; label: string }[] = [
  { value: 'fwd', label: 'Передний' },
  { value: 'rwd', label: 'Задний' },
  { value: 'awd', label: 'Полный' },
]
</script>

<template>
  <div class="space-y-6">
    <!-- Year + mileage (required) -->
    <div class="flex gap-3">
      <label class="block flex-1">
        <span class="mb-1.5 block text-[13px] text-text-muted">Год выпуска <span class="text-like">*</span></span>
        <input
          v-model.number="form.year"
          type="number"
          inputmode="numeric"
          placeholder="2020"
          class="w-full rounded-xl bg-surface px-4 py-3.5 text-[15px] text-text placeholder:text-text-faint outline-none"
        />
      </label>
      <label class="block flex-1">
        <span class="mb-1.5 block text-[13px] text-text-muted">Пробег, км <span class="text-like">*</span></span>
        <input
          v-model.number="form.mileage"
          type="number"
          inputmode="numeric"
          placeholder="80 000"
          class="w-full rounded-xl bg-surface px-4 py-3.5 text-[15px] text-text placeholder:text-text-faint outline-none"
        />
      </label>
    </div>

    <div>
      <p class="mb-2 text-[13px] text-text-muted">Тип кузова</p>
      <ChipGroup v-model="form.bodyType" :options="bodyTypes" />
    </div>

    <div>
      <p class="mb-2 text-[13px] text-text-muted">Коробка передач</p>
      <ChipGroup v-model="form.transmission" :options="transmissions" />
    </div>

    <div>
      <p class="mb-2 text-[13px] text-text-muted">Тип топлива</p>
      <ChipGroup v-model="form.fuelType" :options="fuels" />
    </div>

    <div>
      <p class="mb-2 text-[13px] text-text-muted">Привод</p>
      <ChipGroup v-model="form.driveType" :options="drives" />
    </div>

    <div class="flex gap-3">
      <label class="block flex-1">
        <span class="mb-1.5 block text-[13px] text-text-muted">Объём, л</span>
        <input
          v-model.number="form.engineVolume"
          type="number"
          step="0.1"
          inputmode="decimal"
          placeholder="2.0"
          class="w-full rounded-xl bg-surface px-4 py-3.5 text-[15px] text-text placeholder:text-text-faint outline-none"
        />
      </label>
      <label class="block flex-1">
        <span class="mb-1.5 block text-[13px] text-text-muted">Мощность, л.с.</span>
        <input
          v-model.number="form.enginePower"
          type="number"
          inputmode="numeric"
          placeholder="150"
          class="w-full rounded-xl bg-surface px-4 py-3.5 text-[15px] text-text placeholder:text-text-faint outline-none"
        />
      </label>
    </div>

    <label class="block">
      <span class="mb-1.5 block text-[13px] text-text-muted">Цвет</span>
      <input
        v-model.trim="form.color"
        type="text"
        placeholder="Чёрный"
        class="w-full rounded-xl bg-surface px-4 py-3.5 text-[15px] text-text placeholder:text-text-faint outline-none"
      />
    </label>
  </div>
</template>
