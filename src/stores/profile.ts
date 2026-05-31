import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { City } from '@/types/car'
import { getUserProfile, updateUserProfile, setUserCity, type UserProfile } from '@/api/backend'
import { isLoggedIn } from '@/api/auth'
import { useTelegramStore } from './telegram'

const CITY_KEY = 'avata:city'
const NAME_KEY = 'avata:name'
const PHOTO_KEY = 'avata:photo'

interface StoredCity {
  id: number
  name: string
  regionId: number | null
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
 * User preferences that live on the frontend: chosen city, custom name/photo.
 * When authenticated, syncs city & name with the backend (PATCH /api/users/{me,me/city}).
 */
export const useProfileStore = defineStore('profile', () => {
  const city = ref<StoredCity | null>(loadCity())
  const customName = ref<string | null>(read(NAME_KEY))
  const customPhoto = ref<string | null>(read(PHOTO_KEY))
  const loading = ref(false)
  const userId = ref<number | null>(null)
  const regionName = ref<string | null>(null)

  const cityId = computed(() => city.value?.id ?? null)
  const cityName = computed(() => city.value?.name ?? null)
  const regionId = computed(() => city.value?.regionId ?? null)
  const hasCity = computed(() => city.value !== null)

  /** Fetch profile from backend — returns whether city is set. */
  async function loadFromServer(): Promise<boolean> {
    if (!isLoggedIn()) return false
    loading.value = true
    try {
      const profile: UserProfile = await getUserProfile()
      userId.value = profile.id
      regionName.value = profile.region_name
      if (profile.city_id && profile.city_name) {
        setCity({ id: profile.city_id, name: profile.city_name, regionId: null }, false)
      }
      // In browser mode (no initData) — populate telegram user from server data
      const tgStore = useTelegramStore()
      if (!tgStore.user && !tgStore.initData) {
        tgStore.user = {
          telegram_id: profile.tg_id,
          username: profile.username,
          first_name: profile.first_name ?? '',
          last_name: profile.last_name ?? null,
          photo_url: null,
        }
      }
      return profile.city_id != null && profile.city_name != null
    } catch {
      return false
    } finally {
      loading.value = false
    }
  }

  function setCity(value: City | StoredCity, sync = true) {
    const regionId = 'region' in value ? value.region?.id ?? null : 'regionId' in value ? value.regionId ?? null : null
    city.value = { id: value.id, name: value.name, regionId }
    write(CITY_KEY, JSON.stringify(city.value))
    if (sync && isLoggedIn()) {
      setUserCity(value.id).catch(() => {})
    }
    if (regionId == null) {
      loadRegionForCity(value.id)
    }
  }

  async function loadRegionForCity(cityId: number) {
    try {
      const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
      const raw = await fetch(`${API_URL}/api/geo/cities`).then(r => r.json())
      const found = (raw as any[]).find((c: any) => c.id === cityId)
      if (found && found.region && city.value) {
        city.value = { ...city.value, regionId: found.region }
        write(CITY_KEY, JSON.stringify(city.value))
      }
    } catch { /* ignore */ }
  }

  /** Override display name (empty string clears the override → back to Telegram). */
  async function setName(value: string) {
    const v = value.trim()
    customName.value = v || null
    write(NAME_KEY, customName.value)
    if (isLoggedIn()) {
      try {
        await updateUserProfile({ first_name: v || undefined })
      } catch { /* ignore */ }
    }
  }

  /** Override avatar (data URL); null clears it → back to Telegram photo. */
  function setPhoto(value: string | null) {
    customPhoto.value = value
    write(PHOTO_KEY, value)
  }

  function clear() {
    city.value = null
    customName.value = null
    customPhoto.value = null
    localStorage.removeItem(CITY_KEY)
    localStorage.removeItem(NAME_KEY)
    localStorage.removeItem(PHOTO_KEY)
  }

  return { city, cityId, cityName, regionId, customName, customPhoto, loading, userId, regionName, hasCity, setCity, setName, setPhoto, clear, loadFromServer }
})
