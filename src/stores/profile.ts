import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { City } from '@/types/car'
import { getUserProfile, updateUserProfile, setUserCity, uploadUserAvatar, type UserProfile } from '@/api/backend'
import { getCities } from '@/api/geo.service'
import { isLoggedIn } from '@/api/auth'
import { MOSCOW_ONLY, SINGLE_CITY_NAME } from '@/config'
import { useTelegramStore, recallPhoto } from './telegram'

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
  // Avatar URL: the backend stores it (Telegram photo saved at login, or a custom
  // upload). PHOTO_KEY caches the last known URL so it shows instantly on launch,
  // before loadFromServer resolves; the server value is the source of truth.
  const avatarUrl = ref<string | null>(read(PHOTO_KEY))
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
      // Server is the source of truth for the avatar (may be null if the user has
      // no Telegram photo and never uploaded one — consumers then fall back to the
      // cached Telegram photo_url).
      avatarUrl.value = profile.avatar_url
      write(PHOTO_KEY, profile.avatar_url)
      if (profile.city_id && profile.city_name) {
        // DB is the source of truth — the backend builds the feed from it.
        setCity({ id: profile.city_id, name: profile.city_name, regionId: null }, false)
      } else if (city.value) {
        // We have a locally-chosen city but the backend profile has none (city set
        // before auth, a failed earlier sync, or a backend DB reset). Push it to the
        // DB so the server-side region feed matches what the user sees.
        try {
          await setUserCity(city.value.id)
        } catch {
          /* keep local city; will retry on next launch */
        }
      }
      // Moscow-only launch: there's no city picker — assign the single city so the
      // region feed and new listings have one.
      if (MOSCOW_ONLY && !city.value) {
        await ensureDefaultCity()
      }
      // In browser mode (no initData) — populate telegram user from server data.
      // The backend doesn't store the avatar, so reuse the photo_url we cached at
      // login (recallPhoto) instead of nulling it → the avatar survives a refresh.
      const tgStore = useTelegramStore()
      if (!tgStore.user && !tgStore.initData) {
        tgStore.user = {
          telegram_id: profile.tg_id,
          username: profile.username,
          first_name: profile.first_name ?? '',
          last_name: profile.last_name ?? null,
          photo_url: recallPhoto(),
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

  /**
   * Moscow-only launch: pick the single available city (Москва, or the first one
   * the backend returns) and store it. No-op once a city is set or the flag is off.
   */
  async function ensureDefaultCity() {
    if (!MOSCOW_ONLY || city.value) return
    try {
      const list = (await getCities()).data
      const only = list.find((c) => c.name === SINGLE_CITY_NAME) ?? list[0]
      if (only) setCity(only)
    } catch {
      /* offline / backend down — retry on next launch */
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

  /** Upload a custom avatar to the backend; updates avatarUrl from the response. */
  async function uploadAvatar(file: File): Promise<boolean> {
    try {
      const p = await uploadUserAvatar(file)
      avatarUrl.value = p.avatar_url
      write(PHOTO_KEY, p.avatar_url)
      return true
    } catch {
      return false
    }
  }

  /** Clear the custom avatar on the backend (empty string → NULL). Falls back to
   *  the Telegram photo (re-saved on the next login). */
  async function resetAvatar(): Promise<void> {
    avatarUrl.value = null
    write(PHOTO_KEY, null)
    if (isLoggedIn()) {
      try {
        await updateUserProfile({ avatar_url: '' })
      } catch {
        /* ignore */
      }
    }
  }

  function clear() {
    city.value = null
    customName.value = null
    avatarUrl.value = null
    localStorage.removeItem(CITY_KEY)
    localStorage.removeItem(NAME_KEY)
    localStorage.removeItem(PHOTO_KEY)
  }

  return { city, cityId, cityName, regionId, customName, avatarUrl, loading, userId, regionName, hasCity, setCity, ensureDefaultCity, setName, uploadAvatar, resetAvatar, clear, loadFromServer }
})
