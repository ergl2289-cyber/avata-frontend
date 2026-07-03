import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { tab: 'home' },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/SearchView.vue'),
    props: (route) => ({ q: route.query.q ?? '' }),
    meta: { tab: 'home' },
  },
  {
    path: '/favorites',
    name: 'favorites',
    component: () => import('@/views/FavoritesView.vue'),
    meta: { tab: 'favorites' },
  },
  {
    path: '/listings',
    name: 'listings',
    component: () => import('@/views/MyListingsView.vue'),
    meta: { tab: 'post' },
  },
  {
    path: '/post',
    name: 'post',
    component: () => import('@/views/PostView.vue'),
    props: (route) => ({
      draftId: route.query.draft ?? null,
      carId: route.query.car ? Number(route.query.car) : null,
    }),
    meta: { tab: 'post', hideTabBar: true },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { tab: 'profile' },
  },
  {
    path: '/car/:id',
    name: 'car',
    component: () => import('@/views/ListingView.vue'),
    props: true,
    meta: { hideTabBar: true },
  },
  {
    path: '/privacy',
    name: 'privacy',
    component: () => import('@/views/PrivacyView.vue'),
    meta: { hideTabBar: true, public: true },
  },
  {
    path: '/terms',
    name: 'terms',
    component: () => import('@/views/TermsView.vue'),
    meta: { hideTabBar: true, public: true },
  },
  {
    path: '/dev/api-test',
    name: 'apiTest',
    component: () => import('@/views/ApiTestView.vue'),
  },
  {
    path: '/seller/:id',
    name: 'seller',
    component: () => import('@/views/SellerView.vue'),
    props: true,
    meta: { hideTabBar: true },
  },
  {
    path: '/pay/:orderId',
    name: 'pay',
    component: () => import('@/views/PayView.vue'),
    meta: { hideTabBar: true },
  },
]

/**
 * Warm up the lazy route chunks in the background (called after the app mounts,
 * when the browser is idle). Without this, the first tap on each tab pays a
 * network round-trip for its JS chunk — with it, switching is instant.
 */
export function prefetchRoutes() {
  for (const r of routes) {
    const load = r.component
    if (typeof load === 'function') {
      ;(load as () => Promise<unknown>)().catch(() => {
        /* offline / flaky network — the route will load on demand as before */
      })
    }
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    // Restore scroll on back/forward (kept-alive tabs keep their place); top otherwise.
    return savedPosition ?? { top: 0 }
  },
})
