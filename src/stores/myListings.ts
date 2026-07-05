import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getMyCars, backend } from '@/api/cars.service'
import { coverUrl, galleryUrls } from '@/api/assets'
import type { CarDetail, CarFileJunction, MyCarListItem } from '@/types/car'
import { emptyListingForm, type DraftListing, type ListingForm } from '@/types/listing'
import { modelsMock } from '@/api/mocks/brands.mock'
import { citiesMock } from '@/api/mocks/geo.mock'
import { me, upsertMyCar } from '@/api/mocks/myCars.mock'
import { invalidateCar } from '@/api/cars.cache'
import { useListingVideo } from '@/composables/useListingVideo'

const DRAFTS_KEY = 'avata:drafts'
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

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

  const active = computed(() =>
    published.value.filter((c) => c.moderation_status === 'approved' && c.is_active),
  )
  const moderation = computed(() =>
    published.value.filter((c) => c.moderation_status === 'pending'),
  )
  // Published listings taken off display (approved but is_active=false), plus
  // rejected ones — both land in Архив (a rejected listing has nowhere else to
  // go: it's not active, not pending, and used to just vanish from the app).
  const archivedListings = computed(() =>
    published.value.filter(
      (c) => (c.moderation_status === 'approved' && !c.is_active) || c.moderation_status === 'rejected',
    ),
  )

  const counts = computed(() => ({
    archive: drafts.value.length + archivedListings.value.length,
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
      // JSON clone, not structuredClone: the form is a Vue reactive proxy and
      // structuredClone throws DataCloneError on it (this aborted "Сохранить и
      // выйти" and auto-save). The form is plain JSON data, so this is safe.
      form: JSON.parse(JSON.stringify(form)) as ListingForm,
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

  /**
   * Publish a new listing. Real mode: POST /api/cars (+ photo upload) → reload.
   * Mock mode: persist a pending listing into the in-memory mock DB.
   */
  async function publish(form: ListingForm, draftId?: string): Promise<number> {
    if (!USE_MOCKS) {
      const { car_id } = await backend.createCar(formToCreateData(form))
      // Photos are non-critical: the listing is already created (pending). A photo
      // upload failure must not look like the whole publish failed.
      try {
        await uploadNewPhotos(car_id, form.photos)
      } catch (e) {
        console.error('Photo upload failed (listing still created):', e)
      }
      // Video transcoding on the server takes tens of seconds (up to ~2x the
      // clip length) — awaiting it here left the publish button spinning that
      // whole time. It's optional media like photos: fire it in the background
      // and let the user move on immediately.
      startVideoSync(car_id)
      if (draftId) deleteDraft(draftId)
      await load()
      return car_id
    }
    if (draftId) deleteDraft(draftId)
    const detail = formToDetail(form)
    upsertMyCar(detail)
    published.value.unshift(toMyListItem(detail))
    return detail.id
  }

  /**
   * Save edits to an existing listing. Real mode: PATCH /api/cars/{id} (backend
   * supports price/mileage/description) + upload any new photos → reload.
   * Mock mode: rebuild the listing and re-enter moderation (pending).
   */
  async function updateListing(carId: number, form: ListingForm, base: CarDetail) {
    if (!USE_MOCKS) {
      // Every edit goes back to moderation: take it off the public feed
      // (is_active=false) so an unreviewed edit isn't live. NOTE для бэка: PATCH
      // должен также сбрасывать moderation_status='pending', чтобы админ заново
      // одобрил. Пока ставим pending оптимистично на фронте.
      await backend.updateCar(carId, {
        price: form.price ?? undefined,
        mileage: form.mileage ?? undefined,
        description: form.description.trim() || null,
        engine_volume: form.engineVolume ?? undefined,
        engine_power: form.enginePower ?? undefined,
        transmission: form.transmission ?? undefined,
        fuel_type: form.fuelType ?? undefined,
        drive_type: form.driveType ?? undefined,
        color: form.color ?? undefined,
        is_active: false,
      })
      try {
        await uploadNewPhotos(carId, form.photos)
      } catch (e) {
        console.error('Photo upload failed (edits still saved):', e)
      }
      startVideoSync(carId)
      invalidateCar(carId)
      const item = published.value.find((c) => c.id === carId)
      if (item) {
        if (form.price != null) item.price = form.price
        if (form.mileage != null) item.mileage = form.mileage
        item.moderation_status = 'pending'
        item.is_active = false
      }
      return
    }
    const detail = formToDetail(form, { ...base, id: carId })
    upsertMyCar(detail)
    invalidateCar(carId) // drop any cached (now stale) detail
    const item = toMyListItem(detail)
    const i = published.value.findIndex((c) => c.id === carId)
    if (i >= 0) published.value.splice(i, 1, item)
    else published.value.unshift(item)
  }

  function setActive(id: number, value: boolean) {
    const item = published.value.find((c) => c.id === id)
    if (item) item.is_active = value
  }

  /** Take a published listing off display (Архив). Real: PATCH is_active=false. */
  async function archive(id: number) {
    if (!USE_MOCKS) await backend.updateCar(id, { is_active: false })
    setActive(id, false)
    invalidateCar(id)
  }

  /** Return an archived listing to display. Real: PATCH is_active=true. */
  async function restore(id: number) {
    if (!USE_MOCKS) await backend.updateCar(id, { is_active: true })
    setActive(id, true)
    invalidateCar(id)
  }

  /** Permanently delete a published listing. Real: DELETE /api/cars/{id}. */
  async function removeListing(id: number) {
    if (!USE_MOCKS) await backend.deleteCar(id)
    published.value = published.value.filter((c) => c.id !== id)
    invalidateCar(id)
  }

  return {
    drafts,
    published,
    loading,
    active,
    moderation,
    archivedListings,
    counts,
    load,
    getDraft,
    saveDraft,
    deleteDraft,
    publish,
    updateListing,
    archive,
    restore,
    removeListing,
  }
})

/**
 * Build a full CarDetail from a form (mock-only; the real API does this on the
 * server). `base` preserves fields the form doesn't carry — id, seller, created
 * date, stats, and specs not editable in the wizard (engine_power, category).
 */
function formToDetail(form: ListingForm, base?: CarDetail): CarDetail {
  const model = modelsMock.find((m) => m.id === form.modelId) ?? modelsMock[0]
  const city = citiesMock.find((c) => c.id === form.cityId) ?? citiesMock[0]
  const files: CarFileJunction[] = form.photos.map((url, i) => ({
    id: (base?.files[i]?.id ?? Date.now() + i) as number,
    directus_files_id: { id: url },
  }))
  return {
    id: base?.id ?? Date.now(),
    model,
    year: form.year ?? 0,
    mileage: form.mileage ?? 0,
    price: form.price ?? 0,
    is_active: false,
    date_created: base?.date_created ?? new Date().toISOString(),
    views_global: base?.views_global ?? 0,
    likes_global: base?.likes_global ?? 0,
    moderation_status: 'pending',
    description: form.description.trim() || null,
    city,
    seller: base?.seller ?? me,
    files,
    technical_specs: {
      vehicle_category: base?.technical_specs?.vehicle_category ?? null,
      body_type: form.bodyType,
      engine_volume: form.engineVolume,
      engine_power: form.enginePower ?? base?.technical_specs?.engine_power ?? null,
      transmission: form.transmission,
      fuel_type: form.fuelType,
      drive_type: form.driveType,
      color: form.color,
    },
  }
}

/**
 * Map a wizard form to the backend create payload.
 * NOTE: body_type / vehicle_category are collected as names in the wizard but the
 * backend wants *_id — omitted for now (both optional). TODO: resolve via
 * /api/references once the wizard picks them by id.
 */
function formToCreateData(form: ListingForm): backend.CreateCarData {
  return {
    model_id: form.modelId as number,
    year: form.year ?? 0,
    mileage: form.mileage ?? 0,
    price: form.price ?? 0,
    city_id: form.cityId as number,
    description: form.description.trim() || null,
    source: 'selfposted',
    engine_volume: form.engineVolume,
    engine_power: form.enginePower,
    transmission: form.transmission,
    fuel_type: form.fuelType,
    drive_type: form.driveType,
    color: form.color,
  }
}

/** Convert a data: URL (wizard photo) into a File for multipart upload. */
async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], name, { type: blob.type || 'image/jpeg' })
}

/** Upload only the freshly-added photos (data: URLs); http ones already exist. */
async function uploadNewPhotos(carId: number, photos: string[]): Promise<void> {
  const fresh = photos.filter((p) => p.startsWith('data:'))
  if (!fresh.length) return
  const files = await Promise.all(fresh.map((d, i) => dataUrlToFile(d, `photo-${i}.jpg`)))
  await backend.uploadCarPhotos(carId, files)
}

/**
 * Push the wizard's video state to the backend: upload a freshly-picked clip
 * (replaces the old one server-side) or delete the existing one if removed.
 * Fire-and-forget — the clip is snapshotted synchronously so this can run
 * after resetVideoState() without racing a next wizard session, and the
 * caller never awaits it (transcoding takes tens of seconds server-side;
 * publish/save must not block the UI on that).
 */
function startVideoSync(carId: number): void {
  const { videoFile, removeExisting, resetVideoState } = useListingVideo()
  const file = videoFile.value
  const shouldDelete = removeExisting.value
  resetVideoState()
  if (!file && !shouldDelete) return
  ;(async () => {
    try {
      if (file) {
        await backend.uploadCarVideo(carId, file)
      } else if (shouldDelete) {
        await backend.deleteCarVideo(carId)
      }
    } catch (e) {
      console.error('Video sync failed (listing still saved):', e)
    }
  })()
}

/** Project a full CarDetail down to the lightweight "my listings" item. */
function toMyListItem(d: CarDetail): MyCarListItem {
  return {
    id: d.id,
    model: d.model,
    year: d.year,
    mileage: d.mileage,
    price: d.price,
    is_active: d.is_active,
    date_created: d.date_created,
    city: { id: d.city.id, name: d.city.name },
    files: d.files,
    technical_specs: d.technical_specs
      ? {
          engine_volume: d.technical_specs.engine_volume,
          transmission: d.technical_specs.transmission,
          engine_power: d.technical_specs.engine_power,
          fuel_type: d.technical_specs.fuel_type,
          drive_type: d.technical_specs.drive_type,
          body_type: d.technical_specs.body_type,
        }
      : null,
    moderation_status: d.moderation_status,
    views_global: d.views_global,
    likes_global: d.likes_global,
  }
}

/** Prefill a wizard form from an existing listing (edit mode). */
export function detailToForm(car: CarDetail): ListingForm {
  const t = car.technical_specs
  return {
    ...emptyListingForm(),
    photos: galleryUrls(car.files),
    brandId: car.model.brand.id,
    modelId: car.model.id,
    year: car.year,
    mileage: car.mileage,
    bodyType: t?.body_type ?? null,
    transmission: t?.transmission ?? null,
    fuelType: t?.fuel_type ?? null,
    driveType: t?.drive_type ?? null,
    engineVolume: t?.engine_volume ?? null,
    enginePower: t?.engine_power ?? null,
    color: t?.color ?? null,
    price: car.price,
    cityId: car.city.id,
    description: car.description ?? '',
  }
}

/** Cover URL for a draft (handles data: URLs and empty). */
export function draftCoverUrl(draft: DraftListing): string {
  return draft.cover ? coverUrl([{ id: 0, directus_files_id: { id: draft.cover } }]) : ''
}
