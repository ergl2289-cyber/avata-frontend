<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue'
import { Heart } from 'lucide-vue-next'
import FavoriteCard from '@/components/car/FavoriteCard.vue'
import ConfirmSheet from '@/components/ui/ConfirmSheet.vue'
import { useFavoritesStore } from '@/stores/favorites'

defineOptions({ name: 'FavoritesView' })

const favorites = useFavoritesStore()

const confirmOpen = ref(false)
const pendingId = ref<number | null>(null)

const pendingTitle = computed(() => {
  const car = favorites.items.find((c) => c.id === pendingId.value)
  return car ? `${car.model.brand.name} ${car.model.name}` : ''
})

function askRemove(id: number) {
  pendingId.value = id
  confirmOpen.value = true
}

function confirmRemove() {
  if (pendingId.value != null) favorites.remove(pendingId.value)
  pendingId.value = null
}

// Kept-alive: refresh only when the liked set changed (e.g. a new like added
// elsewhere). The skeleton only shows when empty, so this updates in place.
onMounted(() => favorites.loadItems())
onActivated(() => favorites.loadItems())
</script>

<template>
  <main class="min-h-dvh pb-24">
    <!-- Sticky header -->
    <header class="sticky top-0 z-30 bg-bg/90 backdrop-blur-xl safe-top">
      <div class="flex h-14 items-center justify-center px-4">
        <h1 class="text-[17px] font-semibold text-text">Избранное</h1>
      </div>
    </header>

    <section class="px-4 pt-1">
      <!-- Loading skeletons -->
      <div v-if="favorites.loading && !favorites.items.length" class="space-y-4">
        <div v-for="n in 4" :key="n" class="flex animate-pulse gap-3">
          <div class="h-28 w-28 shrink-0 rounded-card bg-surface" />
          <div class="flex-1 pt-1">
            <div class="h-3.5 w-4/5 rounded bg-surface" />
            <div class="mt-2 h-3 w-2/5 rounded bg-surface" />
            <div class="mt-2 h-3 w-1/3 rounded bg-surface" />
            <div class="mt-4 h-4 w-2/5 rounded bg-surface" />
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div
        v-else-if="!favorites.items.length"
        class="flex flex-col items-center gap-3 px-8 py-28 text-center"
      >
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface">
          <Heart :size="26" :stroke-width="1.6" class="text-text-muted" />
        </div>
        <p class="text-[15px] text-text">В избранном пока пусто</p>
        <p class="text-[13px] text-text-muted">Лайкайте объявления — они появятся здесь</p>
      </div>

      <!-- List -->
      <TransitionGroup v-else name="fav" tag="div" class="space-y-4">
        <FavoriteCard
          v-for="car in favorites.items"
          :key="car.id"
          :car="car"
          @remove="askRemove"
        />
      </TransitionGroup>
    </section>

    <ConfirmSheet
      v-model:open="confirmOpen"
      title="Удалить из избранного?"
      :message="pendingTitle"
      confirm-text="Удалить"
      @confirm="confirmRemove"
    />
  </main>
</template>

<style scoped>
.fav-leave-active {
  transition:
    opacity 250ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
}
.fav-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}
.fav-move {
  transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
