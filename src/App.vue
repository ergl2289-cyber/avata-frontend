<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from '@/components/layout/TabBar.vue'
import { useKeyboardOpen } from '@/composables/useKeyboardOpen'

const route = useRoute()
const { open: keyboardOpen } = useKeyboardOpen()
// hide the fixed tab bar while typing so it doesn't ride up above the keyboard
const showTabBar = computed(() => !route.meta.hideTabBar && !keyboardOpen.value)
</script>

<template>
  <div class="min-h-dvh bg-bg text-text">
    <RouterView v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </RouterView>
    <transition name="tabbar">
      <TabBar v-if="showTabBar" />
    </transition>
  </div>
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition:
    opacity 250ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
}
.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-4px);
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
