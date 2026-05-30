<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FileText, CheckCircle2, Clock } from 'lucide-vue-next'
import MyListingCard from '@/components/listing/MyListingCard.vue'
import DraftCard from '@/components/listing/DraftCard.vue'
import ConfirmSheet from '@/components/ui/ConfirmSheet.vue'
import { useMyListingsStore } from '@/stores/myListings'
import { useTelegram } from '@/composables/useTelegram'

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
      archive: { icon: FileText, text: 'Нет черновиков', hint: 'Начатые объявления сохранятся здесь' },
      active: { icon: CheckCircle2, text: 'Нет активных объявлений', hint: 'Опубликуйте первое объявление' },
      moderation: { icon: Clock, text: 'Нет объявлений на модерации', hint: 'Здесь будут объявления на проверке' },
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

      <!-- Archive (drafts) -->
      <TransitionGroup
        v-else-if="tab === 'archive' && store.drafts.length"
        name="list"
        tag="div"
        class="space-y-4"
      >
        <DraftCard
          v-for="d in store.drafts"
          :key="d.id"
          :draft="d"
          @remove="askRemoveDraft"
        />
      </TransitionGroup>

      <!-- Active -->
      <div v-else-if="tab === 'active' && store.active.length" class="space-y-4">
        <MyListingCard v-for="c in store.active" :key="c.id" :car="c" />
      </div>

      <!-- Moderation -->
      <div v-else-if="tab === 'moderation' && store.moderation.length" class="space-y-4">
        <MyListingCard v-for="c in store.moderation" :key="c.id" :car="c" />
      </div>

      <!-- Empty -->
      <div v-else class="flex flex-col items-center gap-3 px-8 py-24 text-center">
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface">
          <component :is="empty.icon" :size="26" :stroke-width="1.6" class="text-text-muted" />
        </div>
        <p class="text-[15px] text-text">{{ empty.text }}</p>
        <p class="text-[13px] text-text-muted">{{ empty.hint }}</p>
      </div>
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
