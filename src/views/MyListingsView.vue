<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Pencil, Archive, ArchiveRestore, Trash2, Rocket } from 'lucide-vue-next'
import MyListingCard from '@/components/listing/MyListingCard.vue'
import DraftCard from '@/components/listing/DraftCard.vue'
import ConfirmSheet from '@/components/ui/ConfirmSheet.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BoostSheet from '@/components/car/BoostSheet.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useMyListingsStore } from '@/stores/myListings'
import { useTelegram } from '@/composables/useTelegram'
import { carTitle } from '@/utils/format'
import type { MyCarListItem } from '@/types/car'

defineOptions({ name: 'MyListingsView' })

type TabKey = 'archive' | 'active' | 'moderation'

const store = useMyListingsStore()
const router = useRouter()
const route = useRoute()
const { selection, haptic } = useTelegram()

const initialTab = (['archive', 'active', 'moderation'] as const).includes(
  route.query.tab as TabKey,
)
  ? (route.query.tab as TabKey)
  : 'active'
const tab = ref<TabKey>(initialTab)

// Kept-alive view: react to ?tab=… changes (e.g. after publishing/editing) since
// the component isn't re-created on navigation.
watch(
  () => route.query.tab,
  (t) => {
    if ((['archive', 'active', 'moderation'] as const).includes(t as TabKey)) {
      tab.value = t as TabKey
    }
  },
)

const tabs = computed(() => [
  { key: 'archive' as const, label: 'Архив', count: store.counts.archive },
  { key: 'active' as const, label: 'Активные', count: store.counts.active },
  { key: 'moderation' as const, label: 'Модерация', count: store.counts.moderation },
])

const empty = computed(
  () =>
    ({
      archive: { title: 'Черновиков нет', subtitle: 'Незаконченные объявления сохранятся здесь' },
      active: { title: 'Активных объявлений нет', subtitle: 'Разместите первое — оно появится здесь' },
      moderation: { title: 'Ничего на проверке', subtitle: 'Объявления на модерации появятся здесь' },
    })[tab.value],
)

function selectTab(key: TabKey) {
  if (key === tab.value) return
  selection()
  tab.value = key
}

// draft deletion (confirm)
const confirmOpen = ref(false)
const pendingDraftId = ref<string | null>(null)
function askRemoveDraft(id: string) {
  pendingDraftId.value = id
  confirmOpen.value = true
}
function confirmRemoveDraft() {
  if (pendingDraftId.value) store.deleteDraft(pendingDraftId.value)
  pendingDraftId.value = null
}

function createListing() {
  haptic('light')
  router.push({ name: 'post' })
}

/* ---- Actions on a published listing (edit / archive / delete) ---- */
const actionOpen = ref(false)
const actionCar = ref<MyCarListItem | null>(null)
const actionTitle = computed(() => (actionCar.value ? carTitle(actionCar.value) : ''))
// Archive/republish only make sense for approved listings (not ones in moderation).
const canArchive = computed(
  () => actionCar.value?.moderation_status === 'approved' && actionCar.value.is_active,
)
const canRepublish = computed(
  () => actionCar.value?.moderation_status === 'approved' && !actionCar.value.is_active,
)

function openMenu(car: MyCarListItem) {
  actionCar.value = car
  actionOpen.value = true
}

function editListing() {
  const c = actionCar.value
  actionOpen.value = false
  if (c) router.push({ name: 'post', query: { car: c.id } })
}

async function doArchive() {
  const c = actionCar.value
  actionOpen.value = false
  if (!c) return
  haptic('light')
  await store.archive(c.id)
}

async function doRestore() {
  const c = actionCar.value
  actionOpen.value = false
  if (!c) return
  haptic('light')
  await store.restore(c.id)
}

// Boost (paid pin)
const boostOpen = ref(false)
const boostCarId = ref<number | null>(null)
const canBoost = computed(
  () => actionCar.value?.moderation_status === 'approved' && actionCar.value.is_active,
)
function boostListing() {
  const c = actionCar.value
  actionOpen.value = false
  if (!c) return
  boostCarId.value = c.id
  boostOpen.value = true
}
function onBoosted() {
  store.load()
}

const deleteConfirmOpen = ref(false)
function askDelete() {
  actionOpen.value = false
  deleteConfirmOpen.value = true
}
async function confirmDelete() {
  const c = actionCar.value
  if (c) await store.removeListing(c.id)
  actionCar.value = null
}

onMounted(() => store.load())
</script>

<template>
  <main class="min-h-dvh pb-40">
    <!-- Sticky header + tabs -->
    <header class="sticky top-0 z-30 bg-bg/90 backdrop-blur-xl safe-top">
      <div class="flex h-14 items-center justify-center px-4">
        <h1 class="text-[17px] font-semibold text-text">Мои объявления</h1>
      </div>
      <nav class="flex gap-5 px-4">
        <button
          v-for="t in tabs"
          :key="t.key"
          type="button"
          class="relative -mb-px pb-2.5 pt-1 text-[16px] font-semibold transition-colors duration-fast"
          :class="tab === t.key ? 'text-text' : 'text-text-muted'"
          @click="selectTab(t.key)"
        >
          <span class="inline-flex items-start gap-1">
            {{ t.label }}
            <span v-if="t.count" class="text-[11px] font-semibold leading-none text-text-muted">
              {{ t.count }}
            </span>
          </span>
          <span
            v-if="tab === t.key"
            class="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-text"
          />
        </button>
      </nav>
      <div class="h-px w-full bg-border" />
    </header>

    <section class="px-4 pt-4">
      <!-- Loading (published tabs) -->
      <div v-if="store.loading && tab !== 'archive'" class="space-y-4">
        <div v-for="n in 3" :key="n" class="flex animate-pulse gap-3">
          <div class="h-24 w-24 shrink-0 rounded-card bg-surface" />
          <div class="flex-1 pt-1">
            <div class="h-3.5 w-3/4 rounded bg-surface" />
            <div class="mt-2 h-4 w-2/5 rounded bg-surface" />
            <div class="mt-4 h-3 w-1/2 rounded bg-surface" />
          </div>
        </div>
      </div>

      <!-- Archive (off-display listings + drafts) -->
      <TransitionGroup
        v-else-if="tab === 'archive' && (store.archivedListings.length || store.drafts.length)"
        name="list"
        tag="div"
        class="space-y-4"
      >
        <MyListingCard
          v-for="c in store.archivedListings"
          :key="'a' + c.id"
          :car="c"
          archived
          @menu="openMenu"
        />
        <DraftCard
          v-for="d in store.drafts"
          :key="d.id"
          :draft="d"
          @remove="askRemoveDraft"
        />
      </TransitionGroup>

      <!-- Active -->
      <TransitionGroup
        v-else-if="tab === 'active' && store.active.length"
        name="list"
        tag="div"
        class="space-y-4"
      >
        <MyListingCard v-for="c in store.active" :key="c.id" :car="c" @menu="openMenu" />
      </TransitionGroup>

      <!-- Moderation -->
      <TransitionGroup
        v-else-if="tab === 'moderation' && store.moderation.length"
        name="list"
        tag="div"
        class="space-y-4"
      >
        <MyListingCard v-for="c in store.moderation" :key="c.id" :car="c" @menu="openMenu" />
      </TransitionGroup>

      <!-- Empty -->
      <EmptyState v-else :key="tab" :title="empty.title" :subtitle="empty.subtitle" />
    </section>

    <!-- Place-ad button (raised above tab bar for breathing room) -->
    <div
      class="fixed inset-x-0 z-30 px-4"
      style="bottom: calc(84px + var(--safe-bottom))"
    >
      <button
        type="button"
        class="w-full rounded-pill bg-text py-3.5 text-[15px] font-semibold text-bg shadow-lg shadow-black/40 transition-transform duration-fast ease-out-ios active:scale-[0.98]"
        @click="createListing"
      >
        Разместить объявление
      </button>
    </div>

    <ConfirmSheet
      v-model:open="confirmOpen"
      title="Удалить черновик?"
      message="Заполненные данные будут потеряны"
      confirm-text="Удалить"
      @confirm="confirmRemoveDraft"
    />

    <!-- Actions for a published listing -->
    <BottomSheet v-model:open="actionOpen" :title="actionTitle">
      <div class="space-y-1 pb-2">
        <button
          v-if="canBoost"
          type="button"
          class="flex w-full items-center gap-3 rounded-xl px-2 py-3.5 text-[15px] font-medium text-text transition-colors active:bg-surface-2"
          @click="boostListing"
        >
          <Rocket :size="20" :stroke-width="1.8" /> Поднять в топ
        </button>
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-xl px-2 py-3.5 text-[15px] text-text transition-colors active:bg-surface-2"
          @click="editListing"
        >
          <Pencil :size="20" :stroke-width="1.8" /> Редактировать
        </button>
        <button
          v-if="canArchive"
          type="button"
          class="flex w-full items-center gap-3 rounded-xl px-2 py-3.5 text-[15px] text-text transition-colors active:bg-surface-2"
          @click="doArchive"
        >
          <Archive :size="20" :stroke-width="1.8" /> В архив
        </button>
        <button
          v-if="canRepublish"
          type="button"
          class="flex w-full items-center gap-3 rounded-xl px-2 py-3.5 text-[15px] text-text transition-colors active:bg-surface-2"
          @click="doRestore"
        >
          <ArchiveRestore :size="20" :stroke-width="1.8" /> Опубликовать снова
        </button>
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-xl px-2 py-3.5 text-[15px] text-like transition-colors active:bg-surface-2"
          @click="askDelete"
        >
          <Trash2 :size="20" :stroke-width="1.8" /> Удалить
        </button>
      </div>
    </BottomSheet>

    <ConfirmSheet
      v-model:open="deleteConfirmOpen"
      title="Удалить объявление?"
      message="Объявление и его статистика будут удалены безвозвратно"
      confirm-text="Удалить"
      @confirm="confirmDelete"
    />

    <BoostSheet v-model:open="boostOpen" :car-id="boostCarId" @boosted="onBoosted" />
  </main>
</template>

<style scoped>
.list-leave-active {
  transition:
    opacity 250ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
}
.list-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}
.list-move {
  transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
