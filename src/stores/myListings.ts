import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getMyCars } from '@/api/cars.service'
import { coverUrl } from '@/api/assets'
import type { CarFileJunction, MyCarListItem } from '@/types/car'
import type { DraftListing, ListingForm } from '@/types/listing'
import { modelsMock } from '@/api/mocks/brands.mock'
import { citiesMock } from '@/api/mocks/geo.mock'

const DRAFTS_KEY = 'avata:drafts'

function loadDrafts(): DraftListing[] {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? (parsed as DraftListing[]) : []
  } catch {
    return []
  }
}

/** Derive the Архив-card title from a form (brand + model, or "Черновик"). */
export function draftTitle(form: ListingForm): string {
  const m = form.modelId != null ? modelsMock.find((x) => x.id === form.modelId) : null
  if (m) return `${m.brand.name} ${m.name}`
  return 'Черновик'
}

/**
 * "Мои объявления": drafts (Архив, localStorage) + published listings
 * (Активные/Модерация, from getMyCars). Publishing a draft moves it to Модерация.
 */
export const useMyListingsStore = defineStore('myListings', () => {
  const drafts = ref<DraftListing[]>(loadDrafts())
  const published = ref<MyCarListItem[]>([])
  const loading = ref(false)

  const active = computed(() => published.value.filter((c) => c.moderation_status === 'approved'))
  const moderation = computed(() =>
    published.value.filter((c) => c.moderation_status === 'pending'),
  )

  const counts = computed(() => ({
    archive: drafts.value.length,
    active: active.value.length,
    moderation: moderation.value.length,
  }))

  function persistDrafts() {
    try {
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.value))
    } catch {
      /* storage full / unavailable — ignore */
    }
  }

  async function load() {
    drafts.value = loadDrafts()
    loading.value = true
    try {
      published.value = (await getMyCars()).data
    } finally {
      loading.value = false
    }
  }

  function getDraft(id: string): DraftListing | undefined {
    return drafts.value.find((d) => d.id === id)
  }

  /** Insert/update a draft (auto-save & "Сохранить и выйти"). Returns its id. */
  function saveDraft(form: ListingForm, id?: string): string {
    const draftId = id ?? `draft-${Date.now()}`
    const entry: DraftListing = {
      id: draftId,
      updatedAt: new Date().toISOString(),
      title: draftTitle(form),
      cover: form.photos[0] ?? '',
      form: structuredClone(form),
    }
    const idx = drafts.value.findIndex((d) => d.id === draftId)
    if (idx >= 0) drafts.value.splice(idx, 1, entry)
    else drafts.value.unshift(entry)
    persistDrafts()
    return draftId
  }

  function deleteDraft(id: string) {
    drafts.value = drafts.value.filter((d) => d.id !== id)
    persistDrafts()
  }

  /** Publish a form: remove its draft (if any) and add a pending listing (mock). */
  function publish(form: ListingForm, draftId?: string) {
    if (draftId) deleteDraft(draftId)
    published.value.unshift(formToPending(form))
  }

  return {
    drafts,
    published,
    loading,
    active,
    moderation,
    counts,
    load,
    getDraft,
    saveDraft,
    deleteDraft,
    publish,
  }
})

/* Build a pending MyCarListItem from a form (mock-only; real API does this server-side). */
function formToPending(form: ListingForm): MyCarListItem {
  const model = modelsMock.find((m) => m.id === form.modelId) ?? modelsMock[0]
  const city = citiesMock.find((c) => c.id === form.cityId) ?? citiesMock[0]
  const files: CarFileJunction[] = form.photos.map((url, i) => ({
    id: Date.now() + i,
    directus_files_id: { id: url },
  }))
  return {
    id: Date.now(),
    model,
    year: form.year ?? 0,
    mileage: form.mileage ?? 0,
    price: form.price ?? 0,
    is_active: false,
    date_created: new Date().toISOString(),
    city: { id: city.id, name: city.name },
    files,
    technical_specs: {
      engine_volume: form.engineVolume,
      transmission: form.transmission,
    },
    moderation_status: 'pending',
    views_global: 0,
    likes_global: 0,
  }
}

/** Cover URL for a draft (handles data: URLs and empty). */
export function draftCoverUrl(draft: DraftListing): string {
  return draft.cover ? coverUrl([{ id: 0, directus_files_id: { id: draft.cover } }]) : ''
}
