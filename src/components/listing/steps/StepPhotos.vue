<script setup lang="ts">
import { ref } from 'vue'
import { Camera, X } from 'lucide-vue-next'
import type { ListingForm } from '@/types/listing'
import { useTelegram } from '@/composables/useTelegram'

const props = defineProps<{ form: ListingForm }>()
const { haptic } = useTelegram()

const MAX = 10
const input = ref<HTMLInputElement | null>(null)

function pick() {
  input.value?.click()
}

function onFiles(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files) return
  const room = MAX - props.form.photos.length
  Array.from(files)
    .slice(0, room)
    .forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') props.form.photos.push(reader.result)
      }
      reader.readAsDataURL(file)
    })
  ;(e.target as HTMLInputElement).value = ''
}

function remove(i: number) {
  haptic('light')
  props.form.photos.splice(i, 1)
}
</script>

<template>
  <div>
    <p class="mb-3 text-[15px] font-semibold text-text">Фотографии</p>
    <div class="grid grid-cols-3 gap-3">
      <!-- existing photos -->
      <div
        v-for="(photo, i) in form.photos"
        :key="i"
        class="relative aspect-square overflow-hidden rounded-card bg-surface"
      >
        <img :src="photo" alt="" class="h-full w-full object-cover" />
        <button
          type="button"
          aria-label="Удалить фото"
          class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md active:scale-90"
          @click="remove(i)"
        >
          <X :size="15" />
        </button>
      </div>

      <!-- add tile -->
      <button
        v-if="form.photos.length < MAX"
        type="button"
        class="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-card bg-surface text-text-muted transition-transform duration-fast ease-out-ios active:scale-95"
        @click="pick"
      >
        <Camera :size="26" :stroke-width="1.6" />
        <span class="text-[13px]">Добавить</span>
      </button>
    </div>

    <p class="mt-3 text-[13px] text-text-muted">До {{ MAX }} фото. Первое станет обложкой.</p>

    <input
      ref="input"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      @change="onFiles"
    />
  </div>
</template>
