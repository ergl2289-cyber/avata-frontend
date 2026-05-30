<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from '@/components/layout/TabBar.vue'
import { useKeyboardOpen } from '@/composables/useKeyboardOpen'

const route = useRoute()
const { open: keyboardOpen } = useKeyboardOpen()
// hide the fixed tab bar while typing so it doesn't ride up above the keyboard
const showTabBar = computed(() => !route.meta.hideTabBar && !keyboardOpen.value)

// Tab-root screens stay mounted (like a native app): instant switch, no refetch,
// scroll preserved. Detail/transient screens (car, search, post) are not cached.
const KEEP_ALIVE_VIEWS = ['HomeView', 'FavoritesView', 'MyListingsView', 'ProfileView']
</script>

<template>
  <div class="relative min-h-dvh bg-bg text-text">
    <RouterView v-slot="{ Component }">
      <!-- No "out-in" mode: with <keep-alive> it can deadlock waiting on a leave
           callback. Enter/leave overlap; the leaving page is positioned absolute
           (see CSS) so there's no layout jump. -->
      <transition name="page">
        <keep-alive :include="KEEP_ALIVE_VIEWS">
          <component :is="Component" />
        </keep-alive>
      </transition>
    </RouterView>
    <transition name="tabbar">
      <TabBar v-if="showTabBar" />
    </transition>
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
