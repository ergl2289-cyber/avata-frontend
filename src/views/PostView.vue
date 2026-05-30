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
import { useMyListingsStore } from '@/stores/myListings'
import { useTelegram } from '@/composables/useTelegram'

const props = defineProps<{ draftId: string | null }>()

const router = useRouter()
const store = useMyListingsStore()
const { haptic, notify } = useTelegram()

// init form (new or from an existing draft)
const existing = props.draftId ? store.getDraft(props.draftId) : undefined
const form = reactive<ListingForm>(existing ? structuredClone(existing.form) : emptyListingForm())
const currentDraftId = ref<string | null>(props.draftId ?? null)

const step = ref(0)
const direction = ref<'fwd' | 'back'>('fwd')

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
const continueLabel = computed(() => (isLast.value ? 'Опубликовать' : 'Продолжить'))

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
    if (isFormEmpty()) return
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
  // first step: persist if there's anything, then leave
  if (!isFormEmpty()) currentDraftId.value = store.saveDraft(form, currentDraftId.value ?? undefined)
  router.push({ name: 'listings' })
}

function saveExit() {
  haptic('light')
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
  publish()
}

function publish() {
  // all required steps must be valid
  const ok = steps.every((s) => s.valid())
  if (!ok) {
    const firstInvalid = steps.findIndex((s) => !s.valid())
    direction.value = firstInvalid < step.value ? 'back' : 'fwd'
    step.value = firstInvalid
    notify('error')
    return
  }
  store.publish(form, currentDraftId.value ?? undefined)
  notify('success')
  router.push({ name: 'listings', query: { tab: 'moderation' } })
}
</script>

<template>
  <StepShell
    :title="current.title"
    :subtitle="current.subtitle"
    :is-first="step === 0"
    :can-continue="canContinue"
    :continue-label="continueLabel"
    @back="goBack"
    @save-exit="saveExit"
    @continue="next"
  >
    <Transition :name="direction === 'fwd' ? 'slide-fwd' : 'slide-back'" mode="out-in">
      <component :is="current.component" :key="step" :form="form" />
    </Transition>
  </StepShell>
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
