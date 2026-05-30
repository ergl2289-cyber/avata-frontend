import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { City } from '@/types/car'

const CITY_KEY = 'avata:city'
const NAME_KEY = 'avata:name'
const PHOTO_KEY = 'avata:photo'

interface StoredCity {
  id: number
  name: string
}

function loadCity(): StoredCity | null {
  try {
    const raw = localStorage.getItem(CITY_KEY)
    return raw ? (JSON.parse(raw) as StoredCity) : null
  } catch {
    return null
  }
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/**
 * User preferences that live on the frontend: chosen city (Home placeholder) and
 * optional name/photo overrides (the user can customise what Telegram provides).
 * Persisted locally; later may sync to the user's Directus profile.
 */
export const useProfileStore = defineStore('profile', () => {
  const city = ref<StoredCity | null>(loadCity())
  const customName = ref<string | null>(read(NAME_KEY))
  const customPhoto = ref<string | null>(read(PHOTO_KEY))

  const cityId = computed(() => city.value?.id ?? null)
  const cityName = computed(() => city.value?.name ?? null)

  function setCity(value: City | StoredCity) {
    city.value = { id: value.id, name: value.name }
    write(CITY_KEY, JSON.stringify(city.value))
  }

  /** Override display name (empty string clears the override → back to Telegram). */
  function setName(value: string) {
    const v = value.trim()
    customName.value = v || null
    write(NAME_KEY, customName.value)
  }

  /** Override avatar (data URL); null clears it → back to Telegram photo. */
  function setPhoto(value: string | null) {
    customPhoto.value = value
    write(PHOTO_KEY, value)
  }

  return { city, cityId, cityName, customName, customPhoto, setCity, setName, setPhoto }
})
