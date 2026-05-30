<script setup lang="ts">
import { ref } from 'vue'
import { useTelegramStore } from '@/stores/telegram'

const tg = useTelegramStore()
const results = ref<Record<string, { loading: boolean; status: number | null; body: unknown; error: string | null }>>({})
const devTgId = ref(111111)
const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface _Endpoint {
  key: string; label: string; method: string; path: string; auth: boolean; click: () => Promise<void>
}

async function call(key: string, fn: () => Promise<unknown>) {
  results.value[key] = { loading: true, status: null, body: null, error: null }
  try {
    const data = await fn()
    results.value[key].body = data
    results.value[key].status = 200
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string; response?: unknown }
    results.value[key].error = err?.message ?? String(e)
    results.value[key].status = err?.status ?? 0
    results.value[key].body = err?.response ?? null
  } finally {
    results.value[key].loading = false
  }
}

function asJson(v: unknown): string {
  try { return JSON.stringify(v, null, 2) } catch { return String(v) }
}

function devAuth() {
  tg.devAuth(devTgId.value)
}

async function send(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem('avata:jwt')
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  }
  if (body) opts.body = JSON.stringify(body)
  const resp = await fetch(`${apiUrl}${path}`, opts)
  const text = await resp.text()
  let data: unknown
  try { data = JSON.parse(text) } catch { data = text }
  if (!resp.ok) {
    const err = new Error(text) as Error & { status: number; response: unknown }
    err.status = resp.status
    err.response = data
    throw err
  }
  return data
}

const cp = (key: string, method: string, path: string, auth: boolean, click: () => Promise<void>): _Endpoint => ({
  key, label: `${method} ${path}`, method, path, auth, click,
})

// Auth-free
const openEndpoints: _Endpoint[] = [
  cp('geo_regions', 'GET', '/api/geo/regions', false, () => call('geo_regions', () => send('GET', '/api/geo/regions'))),
  cp('geo_cities', 'GET', '/api/geo/cities', false, () => call('geo_cities', () => send('GET', '/api/geo/cities'))),
  cp('ref_brands', 'GET', '/api/references/brands', false, () => call('ref_brands', () => send('GET', '/api/references/brands'))),
  cp('ref_models', 'GET', '/api/references/models', false, () => call('ref_models', () => send('GET', '/api/references/models'))),
  cp('ref_categories', 'GET', '/api/references/vehicle-categories', false, () => call('ref_categories', () => send('GET', '/api/references/vehicle-categories'))),
  cp('ref_body', 'GET', '/api/references/body-types', false, () => call('ref_body', () => send('GET', '/api/references/body-types'))),
  cp('auth_bad', 'POST', '/api/auth/telegram (bad initData → 400)', false, () => call('auth_bad', () => send('POST', '/api/auth/telegram', { init_data: 'fake' }))),
  cp('rev_seller', 'GET', '/api/reviews/seller/1', false, () => call('rev_seller', () => send('GET', '/api/reviews/seller/1'))),
  cp('rev_rating', 'GET', '/api/reviews/seller/1/rating', false, () => call('rev_rating', () => send('GET', '/api/reviews/seller/1/rating'))),
]

// Auth required
const authEndpoints: _Endpoint[] = [
  cp('auth_test', 'POST', '/api/auth/test', true, () => call('auth_test', () => send('POST', '/api/auth/test', { tg_id: devTgId.value }))),
  cp('users_me', 'GET', '/api/users/me', true, () => call('users_me', () => send('GET', '/api/users/me'))),
  cp('users_patch', 'PATCH', '/api/users/me', true, () => call('users_patch', () => send('PATCH', '/api/users/me', { username: 'test_user' }))),
  cp('cars_feed', 'GET', '/api/cars?limit=3', true, () => call('cars_feed', () => send('GET', '/api/cars?limit=3'))),
  cp('cars_my', 'GET', '/api/cars/my', true, () => call('cars_my', () => send('GET', '/api/cars/my'))),
  cp('cars_liked', 'GET', '/api/cars/liked', true, () => call('cars_liked', () => send('GET', '/api/cars/liked'))),
  cp('cars_detail', 'GET', '/api/cars/1', true, () => call('cars_detail', () => send('GET', '/api/cars/1'))),
  cp('cars_like', 'POST', '/api/cars/1/like', true, () => call('cars_like', () => send('POST', '/api/cars/1/like'))),
  cp('cars_view', 'POST', '/api/cars/1/view', true, () => call('cars_view', () => send('POST', '/api/cars/1/view'))),
]

async function createTestCar() {
  const modelResp = await send('GET', '/api/references/models')
  const models = modelResp as { id: number }[]
  const cityResp = await send('GET', '/api/geo/cities')
  const cities = cityResp as { id: number }[]
  await call('cars_create', () => send('POST', '/api/cars', {
    model_id: models[0]?.id ?? 1,
    year: 2023,
    mileage: 10000,
    price: 1500000,
    city_id: cities[0]?.id ?? 1,
    source: 'selfposted',
    transmission: 'automatic',
    fuel_type: 'petrol',
    color: 'Чёрный',
  }))
}

async function createTestReview() {
  await call('rev_create', () => send('POST', '/api/reviews', {
    seller_id: 1,
    rating: 5,
    text: 'Тестовый отзыв через API Test',
  }))
}

async function createAndLikeCar() {
  const modelResp = await send('GET', '/api/references/models')
  const models = modelResp as { id: number }[]
  const carResp = await send('POST', '/api/cars', {
    model_id: models[0]?.id ?? 1,
    year: 2023, mileage: 10000, price: 1500000,
    city_id: 1, source: 'selfposted',
  })
  const car = carResp as { car_id: number }
  await call('car_like_new', () => send('POST', `/api/cars/${car.car_id}/like`))
  await call('car_view_new', () => send('POST', `/api/cars/${car.car_id}/view`))
}
</script>

<template>
  <div class="api-test">
    <header class="header">
      <h1>🔌 API Test Panel</h1>
      <p class="subtitle">
        Server: <code>{{ apiUrl }}</code> &nbsp;|&nbsp;
        JWT: <code v-if="tg.isAuthenticated" class="ok">✅ {{ tg.isAuthenticated ? 'present' : 'absent' }}</code>
        <code v-else class="no">❌ absent</code>
      </p>
    </header>

    <!-- Dev auth -->
    <section v-if="!tg.isAuthenticated && !tg.initData" class="card">
      <h2>🔑 Dev Auth</h2>
      <p>No Telegram initData — use test login to get a JWT.</p>
      <div class="row">
        <input v-model.number="devTgId" type="number" placeholder="tg_id" class="input" />
        <button class="btn btn-primary" @click="devAuth">Login as test user</button>
      </div>
    </section>

    <!-- Open endpoints -->
    <section class="card">
      <h2>🌐 Public endpoints (no auth)</h2>
      <div v-for="ep in openEndpoints" :key="ep.key" class="ep-row">
        <div class="ep-meta">
          <span class="method" :class="ep.method">{{ ep.method }}</span>
          <code class="path">{{ ep.path }}</code>
          <button class="btn btn-call" @click="ep.click" :disabled="results[ep.key]?.loading">
            {{ results[ep.key]?.loading ? '⏳' : '▶ Call' }}
          </button>
        </div>
        <div v-if="results[ep.key]" class="ep-result" :class="{ error: results[ep.key]?.error, ok: results[ep.key]?.status === 200 }">
          <div class="status-badge" :class="{ good: results[ep.key]?.status === 200, bad: results[ep.key]?.error }">
            {{ results[ep.key]?.status ?? '—' }}
          </div>
          <pre v-if="results[ep.key]?.error" class="err-msg">{{ results[ep.key]?.error }}</pre>
          <pre v-else-if="results[ep.key]?.body" class="resp-json">{{ asJson(results[ep.key]?.body) }}</pre>
          <span v-else class="muted">No response yet</span>
        </div>
      </div>
    </section>

    <!-- Auth endpoints -->
    <section class="card">
      <h2>🔒 Protected endpoints (JWT required)</h2>
      <div v-for="ep in authEndpoints" :key="ep.key" class="ep-row">
        <div class="ep-meta">
          <span class="method" :class="ep.method">{{ ep.method }}</span>
          <code class="path">{{ ep.path }}</code>
          <button class="btn btn-call" @click="ep.click" :disabled="results[ep.key]?.loading">
            {{ results[ep.key]?.loading ? '⏳' : '▶ Call' }}
          </button>
        </div>
        <div v-if="results[ep.key]" class="ep-result" :class="{ error: results[ep.key]?.error, ok: results[ep.key]?.status === 200 }">
          <div class="status-badge" :class="{ good: results[ep.key]?.status === 200, bad: results[ep.key]?.error }">
            {{ results[ep.key]?.status ?? '—' }}
          </div>
          <pre v-if="results[ep.key]?.error" class="err-msg">{{ results[ep.key]?.error }}</pre>
          <pre v-else-if="results[ep.key]?.body" class="resp-json">{{ asJson(results[ep.key]?.body) }}</pre>
          <span v-else class="muted">No response yet</span>
        </div>
      </div>
    </section>

    <!-- Complex scenarios -->
    <section class="card">
      <h2>🧪 Complex tests</h2>
      <button class="btn btn-call" @click="createTestCar">Create car (auto-fetches IDs)</button>
      <span v-if="results['cars_create']" class="result-hint">
        <span v-if="results['cars_create'].status === 200">✅ car_id = {{ (results['cars_create'].body as Record<string, unknown>)?.car_id }}</span>
        <span v-else class="err-msg">{{ results['cars_create'].error }}</span>
      </span>
      <br/><br/>
      <button class="btn btn-call" @click="createTestReview">Create review (rating 5)</button>
      <span v-if="results['rev_create']" class="result-hint">
        <span v-if="results['rev_create'].status === 200">✅ review_id = {{ (results['rev_create'].body as Record<string, unknown>)?.review_id }}</span>
        <span v-else class="err-msg">{{ results['rev_create'].error }}</span>
      </span>
      <br/><br/>
      <button class="btn btn-call" @click="createAndLikeCar">Create car → like → view</button>
      <span v-if="results['car_like_new']" class="result-hint">
        <span v-if="results['car_like_new'].status === 200">✅ like: {{ asJson(results['car_like_new'].body) }}</span>
        <span v-else class="err-msg">{{ results['car_like_new'].error }}</span>
      </span>
      <span v-if="results['car_view_new']" class="result-hint">
        <span v-if="results['car_view_new'].status === 200">✅ view: {{ asJson(results['car_view_new'].body) }}</span>
        <span v-else class="err-msg">{{ results['car_view_new'].error }}</span>
      </span>
    </section>
  </div>
</template>

<style scoped>
.api-test {
  max-width: 800px; margin: 20px auto; padding: 0 16px 40px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace;
  color: #e0e0e0;
}
.header { margin-bottom: 24px; }
.header h1 { font-size: 22px; margin: 0 0 4px; }
.subtitle { font-size: 12px; opacity: 0.6; }
.code { font-size: 11px; }
.ok { color: #4caf50; }
.no { color: #f44336; }

.card {
  background: #1a1a1e; border-radius: 10px; padding: 16px; margin-bottom: 16px;
}
.card h2 { font-size: 15px; margin: 0 0 12px; color: #ccc; }

.ep-row { margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #2a2a2e; }
.ep-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.method {
  display: inline-block; font-size: 10px; font-weight: 700;
  padding: 2px 6px; border-radius: 4px; min-width: 42px; text-align: center;
  color: #fff;
}
.method.GET { background: #2196f3; }
.method.POST { background: #4caf50; }
.method.PATCH { background: #ff9800; }
.method.DELETE { background: #f44336; }

.path { font-size: 12px; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.ep-result {
  margin-top: 6px; display: flex; gap: 8px; align-items: flex-start;
  font-size: 12px;
}
.status-badge {
  flex-shrink: 0; font-weight: 700; font-size: 11px;
  padding: 2px 8px; border-radius: 4px; min-width: 30px; text-align: center;
}
.status-badge.good { background: #1b5e20; color: #a5d6a7; }
.status-badge.bad { background: #b71c1c; color: #ef9a9a; }

.err-msg { color: #ef9a9a; white-space: pre-wrap; word-break: break-all; margin: 0; }
.resp-json { color: #a5d6a7; white-space: pre-wrap; word-break: break-all; margin: 0; font-size: 11px; }
.muted { color: #555; }

.btn {
  font-size: 12px; padding: 6px 14px; border-radius: 6px; border: none;
  cursor: pointer; white-space: nowrap;
}
.btn:disabled { opacity: 0.4; cursor: default; }
.btn-primary { background: #4caf50; color: #fff; }
.btn-call { background: #333; color: #ccc; }
.btn-call:hover { background: #444; }

.input {
  background: #2a2a2e; border: 1px solid #3a3a3e; color: #e0e0e0;
  padding: 6px 10px; border-radius: 6px; font-size: 13px;
}
.row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.result-hint { margin-left: 8px; font-size: 11px; }
</style>
