<script setup lang="ts">
import { ref, watch } from 'vue'
import { Camera } from 'lucide-vue-next'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { useProfileStore } from '@/stores/profile'
import { useTelegramStore } from '@/stores/telegram'
import { useTelegram } from '@/composables/useTelegram'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [v: boolean] }>()

const profile = useProfileStore()
const tg = useTelegramStore()
const { haptic } = useTelegram()

const fileInput = ref<HTMLInputElement | null>(null)
const name = ref('')
// undefined = unchanged, null = revert to Telegram, string = new data URL
const photoOverride = ref<string | null | undefined>(undefined)
const preview = ref<string | null>(null)

const tgPhoto = () => tg.user?.photo_url ?? null
const initials = () => (tg.user?.first_name?.[0] ?? '?').toUpperCase()

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    name.value = profile.customName ?? tg.fullName ?? ''
    photoOverride.value = undefined
    preview.value = profile.customPhoto ?? tgPhoto()
  },
)

function choosePhoto() {
  fileInput.value?.click()
}
function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      photoOverride.value = reader.result
      preview.value = reader.result
    }
  }
  reader.readAsDataURL(file)
  ;(e.target as HTMLInputElement).value = ''
}
function resetPhoto() {
  haptic('light')
  photoOverride.value = null
  preview.value = tgPhoto()
}

function save() {
  haptic('medium')
  profile.setName(name.value)
  if (photoOverride.value !== undefined) profile.setPhoto(photoOverride.value)
  emit('update:open', false)
}
</script>

<template>
  <BottomSheet :open="open" title="Редактировать профиль" @update:open="emit('update:open', $event)">
    <div class="flex flex-col items-center pb-2">
      <!-- Avatar -->
      <button
        type="button"
        class="relative h-24 w-24 overflow-hidden rounded-full bg-surface-2 active:scale-95"
        @click="choosePhoto"
      >
        <img v-if="preview" :src="preview" alt="" class="h-full w-full object-cover" />
        <div
          v-else
          class="flex h-full w-full items-center justify-center text-3xl font-semibold text-text-muted"
        >
          {{ initials() }}
        </div>
        <span
          class="absolute inset-x-0 bottom-0 flex h-7 items-center justify-center bg-black/45 text-white backdrop-blur-md"
        >
          <Camera :size="16" />
        </span>
      </button>

      <button
        v-if="preview"
        type="button"
        class="mt-2 text-[13px] text-text-muted active:text-text"
        @click="resetPhoto"
      >
        Вернуть фото из Telegram
      </button>

      <!-- Name -->
      <label class="mt-5 block w-full">
        <span class="mb-1.5 block text-[13px] text-text-muted">Имя</span>
        <input
          v-model="name"
          type="text"
          maxlength="64"
          placeholder="Ваше имя"
          class="w-full rounded-xl bg-surface-2 px-4 py-3.5 text-[15px] text-text placeholder:text-text-faint outline-none"
        />
      </label>

      <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFile" />
    </div>

    <template #footer>
      <button
        type="button"
        :disabled="!name.trim()"
        class="w-full rounded-xl py-3.5 text-[15px] font-semibold transition-transform duration-fast ease-out-ios active:scale-[0.98] disabled:opacity-40"
        :class="name.trim() ? 'bg-text text-bg' : 'bg-surface-2 text-text-faint'"
        @click="save"
      >
        Сохранить
      </button>
    </template>
  </BottomSheet>
</template>
