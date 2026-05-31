<script setup lang="ts">
import { computed, markRaw, reactive, ref, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import StepShell from '@/components/listing/StepShell.vue'
import StepPhotos from '@/components/listing/steps/StepPhotos.vue'
import StepBrandModel from '@/components/listing/steps/StepBrandModel.vue'
import StepSpecs from '@/components/listing/steps/StepSpecs.vue'
import StepPrice from '@/components/listing/steps/StepPrice.vue'
import StepCity from '@/components/listing/steps/StepCity.vue'
import StepDescription from '@/components/listing/steps/StepDescription.vue'
import { emptyListingForm, type ListingForm } from '@/types/listing'
import { useMyListingsStore, detailToForm } from '@/stores/myListings'
import { getCarById } from '@/api/cars.service'
import { useTelegram } from '@/composables/useTelegram'
import type { CarDetail } from '@/types/car'

const props = defineProps<{ draftId: string | null; carId: number | null }>()

const router = useRouter()
const store = useMyListingsStore()
const { haptic, notify } = useTelegram()

// Edit mode: prefill from an existing published listing instead of a draft.
const isEdit = computed(() => props.carId != null)
const loadingEdit = ref(props.carId != null)
let editBase: CarDetail | null = null

// init form (new, from an existing draft, or — async — from a listing being edited)
const existing = props.draftId ? store.getDraft(props.draftId) : undefined
const form = reactive<ListingForm>(existing ? structuredClone(existing.form) : emptyListingForm())
const currentDraftId = ref<string | null>(props.draftId ?? null)

if (props.carId != null) {
  getCarById(props.carId)
    .then((res) => {
      editBase = res.data
      Object.assign(form, detailToForm(res.data))
    })
    .catch(() => notify('error'))
    .finally(() => (loadingEdit.value = false))
}

const step = ref(0)
const direction = ref<'fwd' | 'back'>('fwd')
const submitting = ref(false)

const steps = [
  { component: markRaw(StepPhotos), title: 'Внешний вид', subtitle: 'Добавьте фотографии автомобиля', valid: () => true },
  { component: markRaw(StepBrandModel), title: 'Марка и модель', subtitle: 'Выберите марку и модель', valid: () => form.brandId != null && form.modelId != null },
  { component: markRaw(StepSpecs), title: 'Характеристики', subtitle: 'Год и пробег обязательны', valid: () => !!form.year && form.mileage != null },
  { component: markRaw(StepPrice), title: 'Укажите цену', subtitle: '', valid: () => form.price != null && form.price > 0 },
  { component: markRaw(StepCity), title: 'Город', subtitle: 'Где находится автомобиль', valid: () => form.cityId != null },
  { component: markRaw(StepDescription), title: 'Описание', subtitle: 'Необязательно, но помогает продать', valid: () => true },
]

const current = computed(() => steps[step.value])
const isLast = computed(() => step.value === steps.length - 1)
const canContinue = computed(() => current.value.valid())
const continueLabel = computed(() =>
  submitting.value
    ? 'Подождите…'
    : isLast.value
      ? isEdit.value
        ? 'Сохранить'
        : 'Опубликовать'
      : 'Продолжить',
)

function isFormEmpty(): boolean {
  return (
    form.photos.length === 0 &&
    form.brandId == null &&
    form.modelId == null &&
    form.year == null &&
    form.mileage == null &&
    form.price == null &&
    form.cityId == null &&
    form.bodyType == null &&
    form.transmission == null &&
    form.fuelType == null &&
    form.driveType == null &&
    form.engineVolume == null &&
    !form.color &&
    form.description.trim() === ''
  )
}

/* Auto-save: debounce-persist the draft whenever the form changes (the
 * "user got distracted and left" case). Empty forms are not persisted. */
let saveTimer: ReturnType<typeof setTimeout> | null = null
watch(
  form,
  () => {
    if (isEdit.value || isFormEmpty()) return // editing a live listing isn't a draft
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      currentDraftId.value = store.saveDraft(form, currentDraftId.value ?? undefined)
    }, 600)
  },
  { deep: true },
)
onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer)
})

function goBack() {
  haptic('light')
  if (step.value > 0) {
    direction.value = 'back'
    step.value--
    return
  }
  // Editing: leave without touching drafts. New listing: persist progress.
  if (!isEdit.value && !isFormEmpty()) {
    currentDraftId.value = store.saveDraft(form, currentDraftId.value ?? undefined)
  }
  router.push({ name: 'listings' })
}

function saveExit() {
  haptic('light')
  if (isEdit.value) {
    void saveListing()
    return
  }
  if (!isFormEmpty()) {
    currentDraftId.value = store.saveDraft(form, currentDraftId.value ?? undefined)
  }
  router.push({ name: 'listings', query: { tab: 'archive' } })
}

function next() {
  if (!canContinue.value) return
  if (!isLast.value) {
    direction.value = 'fwd'
    step.value++
    haptic('light')
    return
  }
  if (isEdit.value) void saveListing()
  else void publish()
}

/** Jump to the first invalid step; returns false if the form isn't complete. */
function ensureValid(): boolean {
  const firstInvalid = steps.findIndex((s) => !s.valid())
  if (firstInvalid === -1) return true
  direction.value = firstInvalid < step.value ? 'back' : 'fwd'
  step.value = firstInvalid
  notify('error')
  return false
}

async function publish() {
  if (submitting.value || !ensureValid()) return
  submitting.value = true
  try {
    await store.publish(form, currentDraftId.value ?? undefined)
    notify('success')
    router.push({ name: 'listings', query: { tab: 'moderation' } })
  } catch {
    notify('error')
    submitting.value = false
  }
}

/** Save edits to an existing listing → back to moderation. */
async function saveListing() {
  if (submitting.value || !ensureValid() || editBase == null) return
  submitting.value = true
  try {
    await store.updateListing(editBase.id, form, editBase)
    notify('success')
    router.push({ name: 'listings', query: { tab: 'moderation' } })
  } catch {
    notify('error')
    submitting.value = false
  }
}
</script>

<template>
  <!-- Single root element: a root-level v-if/v-else makes the component a
       fragment, which breaks the parent <transition mode="out-in">. -->
  <div class="min-h-dvh bg-bg">
    <!-- Loading the listing being edited -->
    <div v-if="loadingEdit" class="flex min-h-dvh items-center justify-center">
      <span class="h-6 w-6 animate-spin rounded-full border-2 border-text-faint border-t-text" />
    </div>

    <StepShell
      v-else
      :title="current.title"
      :subtitle="current.subtitle"
      :is-first="step === 0"
      :can-continue="canContinue && !submitting"
      :continue-label="continueLabel"
      @back="goBack"
      @save-exit="saveExit"
      @continue="next"
    >
      <Transition :name="direction === 'fwd' ? 'slide-fwd' : 'slide-back'" mode="out-in">
        <component :is="current.component" :key="step" :form="form" />
      </Transition>
    </StepShell>
  </div>
</template>

<style scoped>
.slide-fwd-enter-active,
.slide-fwd-leave-active,
.slide-back-enter-active,
.slide-back-leave-active {
  transition:
    opacity 200ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-fwd-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.slide-fwd-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
.slide-back-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}
.slide-back-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
