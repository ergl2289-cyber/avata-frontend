<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Search, Heart, SquarePlus, User, Bug } from 'lucide-vue-next'
import { useTelegram } from '@/composables/useTelegram'
import { useFavoritesStore } from '@/stores/favorites'

const route = useRoute()
const { selection } = useTelegram()
const favorites = useFavoritesStore()

// Вкладка «Тест» (API Test Panel) скрыта из пользовательского интерфейса.
// Чтобы вернуть её в таб-бар — поставь true. Сам экран при этом всегда доступен
// по прямому адресу /dev/api-test (роут не удалён), так что Игорь может зайти
// в него и не включая вкладку.
const SHOW_API_TEST = false

const tabs = computed(() => {
  const base = [
    { tab: 'home', to: '/', label: 'Поиск', icon: Search },
    { tab: 'favorites', to: '/favorites', label: 'Избранное', icon: Heart },
    { tab: 'post', to: '/listings', label: 'Объявления', icon: SquarePlus },
    { tab: 'profile', to: '/profile', label: 'Профиль', icon: User },
  ]
  if (SHOW_API_TEST) {
    base.push({ tab: 'apiTest', to: '/dev/api-test', label: 'Тест', icon: Bug })
  }
  return base
})

const activeTab = computed(() => route.meta.tab as string | undefined)
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 backdrop-blur-xl safe-bottom"
  >
    <ul class="mx-auto flex max-w-2xl items-stretch justify-around px-2 pt-2">
      <li v-for="t in tabs" :key="t.tab" class="flex-1">
        <RouterLink
          :to="t.to"
          class="group relative flex flex-col items-center gap-1 rounded-xl py-1.5 transition-transform duration-fast ease-out-ios active:scale-95"
          @click="selection()"
        >
          <span class="relative">
            <component
              :is="t.icon"
              :size="24"
              :stroke-width="activeTab === t.tab ? 2.2 : 1.8"
              :class="activeTab === t.tab ? 'text-text' : 'text-text-muted'"
              class="transition-colors duration-fast"
            />
            <span
              v-if="t.tab === 'favorites' && favorites.count"
              class="absolute -right-2 -top-1.5 min-w-[16px] rounded-full bg-like px-1 text-center text-[10px] font-semibold leading-4 text-white"
            >
              {{ favorites.count }}
            </span>
          </span>
          <span
            class="text-[10px] leading-none transition-colors duration-fast"
            :class="activeTab === t.tab ? 'text-text' : 'text-text-muted'"
          >
            {{ t.label }}
          </span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
