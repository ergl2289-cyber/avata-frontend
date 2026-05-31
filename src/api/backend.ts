import { getToken } from './auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface BackendRequestInit extends RequestInit {
  params?: Record<string, string | number | null | undefined>
  json?: unknown
}

function buildQuery(params?: Record<string, string | number | null | undefined>): string {
  if (!params) return ''
  const sp = new URLSearchParams()
  for (const [key, val] of Object.entries(params)) {
    if (val != null) sp.set(key, String(val))
  }
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

async function request<T>(path: string, opts: BackendRequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = `${API_URL}${path}${buildQuery(opts.params)}`

  const body = opts.json ? JSON.stringify(opts.json) : opts.body

  const resp = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body,
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`API ${resp.status} ${path}: ${text || resp.statusText}`)
  }

  if (resp.status === 204) return undefined as T
  return resp.json() as Promise<T>
}

/* ------------------------------------------------------------------
 * Auth
 * ------------------------------------------------------------------ */

export interface AuthResponse {
  token: string
  user_id: number
  tg_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  city_id: number | null
  is_new_user: boolean
}

export function telegramAuth(initData: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/telegram', {
    method: 'POST',
    json: { init_data: initData },
  })
}

/* ------------------------------------------------------------------
 * User
 * ------------------------------------------------------------------ */

export interface UserProfile {
  id: number
  tg_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  city_id: number | null
  city_name: string | null
  region_name: string | null
  rating: number
}

export function getUserProfile(): Promise<UserProfile> {
  return request<UserProfile>('/api/users/me')
}

export function updateUserProfile(data: Partial<Pick<UserProfile, 'username' | 'first_name' | 'last_name' | 'phone' | 'city_id'>>): Promise<UserProfile> {
  return request<UserProfile>('/api/users/me', { method: 'PATCH', json: data })
}

export function setUserCity(cityId: number): Promise<UserProfile> {
  return request<UserProfile>('/api/users/me/city', { method: 'PATCH', json: { city_id: cityId } })
}

/* ------------------------------------------------------------------
 * Cars — feed
 * ------------------------------------------------------------------ */

export interface CarListFeedItem {
  id: number
  model_name: string
  brand_name: string
  year: number
  mileage: number
  price: number
  city_name: string
  region_id: number | null
  first_photo_url: string | null
  views_global: number
  likes_global: number
  date_created: string
}

export interface CarFeedResponse {
  items: CarListFeedItem[]
  next_cursor: number | null
}

export interface CarFiltersParams {
  brand_id?: number | null
  model_id?: number | null
  year_min?: number | null
  year_max?: number | null
  price_min?: number | null
  price_max?: number | null
  mileage_max?: number | null
  city_id?: number | null
  body_type_id?: number | null
  vehicle_category_id?: number | null
  transmission?: string | null
  fuel_type?: string | null
  drive_type?: string | null
  sort_by?: string
  cursor?: number | null
  limit?: number
}

export function getCarsFeed(filters: CarFiltersParams): Promise<CarFeedResponse> {
  const params: Record<string, string | number | null | undefined> = { ...filters }
  return request<CarFeedResponse>('/api/cars', { params })
}

export function getMyCars(cursor?: number | null, limit?: number): Promise<CarFeedResponse> {
  return request<CarFeedResponse>('/api/cars/my', {
    params: { cursor, limit },
  })
}

export function getLikedCars(cursor?: number | null, limit?: number): Promise<CarFeedResponse> {
  return request<CarFeedResponse>('/api/cars/liked', {
    params: { cursor, limit },
  })
}

/* ------------------------------------------------------------------
 * Cars — detail
 * ------------------------------------------------------------------ */

export interface SellerInfo {
  id: number
  first_name: string | null
  last_name: string | null
  username: string | null
  rating: number
}

export interface TechnicalSpecs {
  body_type_name: string | null
  vehicle_category_name: string | null
  engine_volume: number | null
  engine_power: number | null
  transmission: string | null
  fuel_type: string | null
  drive_type: string | null
  color: string | null
}

export interface LegalData {
  vin: string | null
  license_plate: string | null
  chassis_number: string | null
  is_wanted: boolean | null
  accident_count: number | null
  is_restricted: boolean | null
  last_check_date: string | null
}

export interface PhotoInfo {
  id: string
  url: string
}

export interface CarDetailResponse {
  id: number
  model_name: string
  brand_name: string
  year: number
  mileage: number
  price: number
  city_name: string
  region_id: number | null
  views_global: number
  likes_global: number
  is_active: boolean
  moderation_status: string
  source: string | null
  date_created: string
  date_updated: string | null
  seller: SellerInfo | null
  technical: TechnicalSpecs | null
  legal: LegalData | null
  photos: PhotoInfo[]
  is_liked: boolean
}

export function getCarDetail(id: number): Promise<CarDetailResponse> {
  return request<CarDetailResponse>(`/api/cars/${id}`)
}

/* ------------------------------------------------------------------
 * Cars — creation
 * ------------------------------------------------------------------ */

export interface CreateCarData {
  model_id: number
  year: number
  mileage: number
  price: number
  city_id: number
  description?: string | null
  source?: string
  vehicle_category_id?: number | null
  body_type_id?: number | null
  engine_volume?: number | null
  engine_power?: number | null
  transmission?: string | null
  fuel_type?: string | null
  drive_type?: string | null
  color?: string | null
  vin?: string | null
  license_plate?: string | null
  chassis_number?: string | null
}

export function createCar(data: CreateCarData): Promise<{ car_id: number }> {
  return request<{ car_id: number }>('/api/cars', {
    method: 'POST',
    json: data,
  })
}

/** Fields editable via PATCH /api/cars/{id}. */
export interface UpdateCarData {
  model_id?: number
  year?: number
  mileage?: number
  price?: number
  description?: string | null
  city_id?: number
  is_active?: boolean
  transmission?: string | null
  fuel_type?: string | null
  drive_type?: string | null
  color?: string | null
  engine_volume?: number | null
  engine_power?: number | null
  vehicle_category_id?: number | null
  body_type_id?: number | null
}

export function updateCar(
  id: number,
  data: UpdateCarData,
): Promise<{ car_id: number; updated: string[] }> {
  return request<{ car_id: number; updated: string[] }>(`/api/cars/${id}`, {
    method: 'PATCH',
    json: data,
  })
}

/* ------------------------------------------------------------------
 * Cars — photos
 * ------------------------------------------------------------------ */

export async function uploadCarPhotos(carId: number, files: File[]): Promise<string[]> {
  const token = getToken()
  const form = new FormData()
  files.forEach((f) => form.append('files', f))

  const resp = await fetch(`${API_URL}/api/cars/${carId}/photos`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!resp.ok) throw new Error(`Photo upload failed: ${resp.status}`)
  const data = await resp.json()
  return data.file_ids as string[]
}

/* ------------------------------------------------------------------
 * Likes & Views
 * ------------------------------------------------------------------ */

export function toggleLike(carId: number): Promise<{ is_liked: boolean; likes_count: number }> {
  return request<{ is_liked: boolean; likes_count: number }>(`/api/cars/${carId}/like`, {
    method: 'POST',
  })
}

export function recordView(carId: number): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/cars/${carId}/view`, { method: 'POST' })
}

/* ------------------------------------------------------------------
 * Reviews
 * ------------------------------------------------------------------ */

export interface ReviewData {
  seller_id?: number | null
  car_id?: number | null
  rating: number
  text?: string | null
}

export function createReview(data: ReviewData): Promise<{ review_id: number; status: string }> {
  return request<{ review_id: number; status: string }>('/api/reviews', {
    method: 'POST',
    json: data,
  })
}

export interface ReviewItem {
  id: number
  author_id: number
  author_name: string | null
  seller_id: number | null
  car_id: number | null
  rating: number
  text: string | null
  status: string
  date_created: string
}

export function getSellerReviews(sellerId: number, limit = 20, offset = 0): Promise<ReviewItem[]> {
  return request<ReviewItem[]>(`/api/reviews/seller/${sellerId}`, {
    params: { limit, offset },
  })
}

export interface SellerRating {
  seller_id: number
  avg_rating: number | null
  review_count: number
}

export function getSellerRating(sellerId: number): Promise<SellerRating> {
  return request<SellerRating>(`/api/reviews/seller/${sellerId}/rating`)
}
