<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from '@/components/layout/TabBar.vue'
import LoginView from '@/views/LoginView.vue'
import { useKeyboardOpen } from '@/composables/useKeyboardOpen'
import { useTelegramStore } from '@/stores/telegram'
import { useProfileStore } from '@/stores/profile'

const route = useRoute()
const { open: keyboardOpen } = useKeyboardOpen()
const tg = useTelegramStore()
const profile = useProfileStore()

// Load profile from backend when Telegram auth completes
watch(() => tg.isAuthenticated, async (authed) => {
  if (authed) await profile.loadFromServer()
}, { immediate: true })

const showTabBar = computed(() => !route.meta.hideTabBar && !keyboardOpen.value)

const KEEP_ALIVE_VIEWS = ['HomeView', 'FavoritesView', 'MyListingsView', 'ProfileView']
</script>

<template>
  <div class="relative min-h-dvh bg-bg text-text">
    <!-- Auth loading — only when we have initData (Telegram) and are authenticating -->
    <div v-if="tg.initData && tg.authLoading && !tg.isAuthenticated" class="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p class="text-sm text-text-muted">Входим…</p>
    </div>
    <!-- Auth error — only for Telegram mode -->
    <div v-else-if="tg.initData && tg.authError && !tg.isAuthenticated" class="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p class="text-sm text-red-400">Ошибка авторизации</p>
      <p class="text-xs text-text-muted">{{ tg.authError }}</p>
      <button class="rounded-lg bg-primary px-4 py-2 text-sm text-white" @click="tg.authenticate()">
        Повторить
      </button>
    </div>
    <!-- Browser mode, not authenticated → Login via Telegram Widget -->
    <LoginView v-else-if="!tg.initData && !tg.isAuthenticated" />
    <!-- Profile loading after browser auth — wait for city/profile from server -->
    <div v-else-if="!tg.initData && profile.loading" class="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p class="text-sm text-text-muted">Загрузка профиля…</p>
    </div>
    <!-- Main app — Telegram (authenticated) or Browser (authenticated) -->
    <template v-else>
      <RouterView v-slot="{ Component }">
        <transition name="page">
          <keep-alive :include="KEEP_ALIVE_VIEWS">
            <component :is="Component" />
          </keep-alive>
        </transition>
      </RouterView>
      <transition name="tabbar">
        <TabBar v-if="showTabBar" />
      </transition>
    </template>
  </div>
</template>

<style>
.page-enter-active {
  transition:
    opacity 180ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
}
/* The leaving page is taken out of flow so it doesn't push the entering one down. */
.page-leave-active {
  position: absolute;
  inset: 0;
  z-index: 0;
  transition: opacity 130ms ease-in;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(5px);
}
.page-leave-to {
  opacity: 0;
}

/* tab bar slides down out of view when the keyboard opens */
.tabbar-enter-active,
.tabbar-leave-active {
  transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
}
.tabbar-enter-from,
.tabbar-leave-to {
  transform: translateY(100%);
}
</style>
