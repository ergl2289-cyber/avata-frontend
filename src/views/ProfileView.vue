<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import WebApp from '@twa-dev/sdk'
import { MoreHorizontal, ChevronRight, MapPin, Pencil, LogOut, ShieldCheck, FileText } from 'lucide-vue-next'
import CenterDialog from '@/components/ui/CenterDialog.vue'
import CityPickerSheet from '@/components/geo/CityPickerSheet.vue'
import EditProfileSheet from '@/components/profile/EditProfileSheet.vue'
import { useTelegramStore } from '@/stores/telegram'
import { useProfileStore } from '@/stores/profile'
import { useTelegram } from '@/composables/useTelegram'
import { MOSCOW_ONLY, SINGLE_CITY_NAME } from '@/config'
import type { City } from '@/types/car'

defineOptions({ name: 'ProfileView' })

const tg = useTelegramStore()
const profile = useProfileStore()
const { haptic } = useTelegram()
const router = useRouter()

const deleteOpen = ref(false)
const cityOpen = ref(false)
const editOpen = ref(false)

const displayName = computed(() => profile.customName || tg.fullName || 'Профиль')
const avatar = computed(() => profile.avatarUrl || tg.user?.photo_url || null)
const username = computed(() => tg.user?.username ?? null)
const idText = computed(() => (tg.user ? String(tg.user.telegram_id) : '—'))
const initials = computed(() => (tg.user?.first_name?.[0] ?? '?').toUpperCase())

// A cached Telegram photo URL can expire/403 — fall back to initials instead of a
// broken image. Reset when the source changes so a new valid photo gets a chance.
const avatarBroken = ref(false)
watch(avatar, () => (avatarBroken.value = false))

function openDelete() {
  haptic('light')
  deleteOpen.value = true
}
function openEdit() {
  haptic('light')
  editOpen.value = true
}
function onCitySelect(city: City) {
  profile.setCity(city)
}

function doLogout() {
  tg.logout()
  profile.clear()
  localStorage.removeItem('avata:favorites')
  localStorage.removeItem('avata:drafts')
  router.push({ name: 'home' })
}

function deleteAccount() {
  // Mock: backend deletion endpoint not ready. Clear local data and close the app.
  // TODO: call accountService.deleteAccount() once Igor's API is available.
  try {
    localStorage.removeItem('avata:favorites')
    localStorage.removeItem('avata:drafts')
    localStorage.removeItem('avata:city')
  } catch {
    /* ignore */
  }
  try {
    WebApp.close()
  } catch {
    /* not in Telegram */
  }
}
</script>

<template>
  <main class="min-h-dvh pb-24">
    <!-- Top bar: edit + three-dots. Items align to top so the corner gaps
         (top = left/right = 16px) stay symmetric despite the round button. -->
    <header
      class="flex items-start justify-between px-4 pb-2"
      style="padding-top: calc(16px + var(--safe-top))"
    >
      <button
        type="button"
        aria-label="Изменить профиль"
        class="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-text transition-transform duration-fast ease-out-ios active:scale-90"
        @click="openEdit"
      >
        <Pencil :size="18" :stroke-width="2" />
      </button>
      <button
        type="button"
        aria-label="Меню"
        class="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-text transition-transform duration-fast ease-out-ios active:scale-90"
        @click="openDelete"
      >
        <MoreHorizontal :size="20" />
      </button>
    </header>

    <!-- Identity -->
    <section class="flex flex-col items-center px-6 pt-2">
      <button
        type="button"
        class="h-32 w-32 overflow-hidden rounded-full bg-surface ring-1 ring-border transition-transform duration-fast ease-out-ios active:scale-95"
        @click="openEdit"
      >
        <img
          v-if="avatar && !avatarBroken"
          :src="avatar"
          :alt="displayName"
          class="h-full w-full object-cover"
          @error="avatarBroken = true"
        />
        <div
          v-else
          class="flex h-full w-full items-center justify-center text-4xl font-semibold text-text-muted"
        >
          {{ initials }}
        </div>
      </button>
      <h1 class="mt-3 text-[22px] font-bold text-text">{{ displayName }}</h1>
      <p v-if="username" class="mt-0.5 text-[15px] text-text-muted">@{{ username }}</p>
    </section>

    <!-- Info card -->
    <section class="px-4 pt-7">
      <div class="overflow-hidden rounded-card bg-surface">
        <div class="px-4 py-3">
          <p class="text-[13px] text-text-muted">ID</p>
          <p class="mt-0.5 text-[15px] text-text">{{ idText }}</p>
        </div>

        <div v-if="username" class="mx-4 h-px bg-border" />
        <div v-if="username" class="px-4 py-3">
          <p class="text-[13px] text-text-muted">Имя пользователя</p>
          <p class="mt-0.5 text-[15px] text-text">@{{ username }}</p>
        </div>

        <div class="mx-4 h-px bg-border" />
        <!-- Moscow-only launch: city is fixed, show it as a static row. -->
        <div v-if="MOSCOW_ONLY" class="px-4 py-3">
          <p class="text-[13px] text-text-muted">Город</p>
          <p class="mt-0.5 text-[15px] text-text">{{ SINGLE_CITY_NAME }}</p>
          <p class="mt-0.5 text-[12px] text-text-faint">Пока доступна только Москва</p>
        </div>
        <button
          v-else
          type="button"
          class="flex w-full items-center justify-between px-4 py-3 text-left transition-colors active:bg-surface-2"
          @click="cityOpen = true"
        >
          <span class="min-w-0">
            <span class="block text-[13px] text-text-muted">Город</span>
            <span
              class="mt-0.5 block text-[15px]"
              :class="profile.cityName ? 'text-text' : 'text-text-faint'"
            >
              {{ profile.cityName ?? 'Не выбран' }}
            </span>
          </span>
          <span class="flex items-center gap-1 text-text-muted">
            <MapPin v-if="!profile.cityName" :size="18" :stroke-width="1.8" />
            <ChevronRight :size="18" />
          </span>
        </button>

        <template v-if="!tg.initData">
          <div class="mx-4 h-px bg-border" />
          <button
            type="button"
            class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-surface-2"
            @click="doLogout"
          >
            <LogOut :size="18" :stroke-width="1.8" class="text-text-muted" />
            <span class="text-[15px] text-text">Выйти</span>
          </button>
        </template>
      </div>
    </section>

    <!-- Legal -->
    <section class="px-4 pt-4">
      <div class="overflow-hidden rounded-card bg-surface">
        <RouterLink
          to="/terms"
          class="flex items-center justify-between px-4 py-3 transition-colors active:bg-surface-2"
          @click="haptic('light')"
        >
          <span class="flex items-center gap-3">
            <FileText :size="18" :stroke-width="1.8" class="text-text-muted" />
            <span class="text-[15px] text-text">Пользовательское соглашение</span>
          </span>
          <ChevronRight :size="18" class="text-text-muted" />
        </RouterLink>
        <div class="mx-4 h-px bg-border" />
        <RouterLink
          to="/privacy"
          class="flex items-center justify-between px-4 py-3 transition-colors active:bg-surface-2"
          @click="haptic('light')"
        >
          <span class="flex items-center gap-3">
            <ShieldCheck :size="18" :stroke-width="1.8" class="text-text-muted" />
            <span class="text-[15px] text-text">Политика конфиденциальности</span>
          </span>
          <ChevronRight :size="18" class="text-text-muted" />
        </RouterLink>
      </div>
    </section>

    <!-- Delete account: centered minimalist dialog -->
    <CenterDialog
      v-model:open="deleteOpen"
      title="Удалить аккаунт?"
      message="Это действие необратимо. Ваши объявления и данные будут удалены."
      confirm-text="Удалить аккаунт"
      destructive
      @confirm="deleteAccount"
    />

    <!-- City picker -->
    <CityPickerSheet
      v-model:open="cityOpen"
      :selected-id="profile.cityId"
      @select="onCitySelect"
    />

    <!-- Edit profile (name + photo) -->
    <EditProfileSheet v-model:open="editOpen" />
  </main>
</template>
