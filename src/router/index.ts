import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
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
    props: (route) => ({ draftId: route.query.draft ?? null }),
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
    path: '/dev/api-test',
    name: 'apiTest',
    component: () => import('@/views/ApiTestView.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})
