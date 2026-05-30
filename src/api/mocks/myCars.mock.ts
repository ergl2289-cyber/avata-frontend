import type { CarDetail, CarFileJunction } from '@/types/car'
import type { DirectusFile } from '@/types/directus'
import { modelsMock } from './brands.mock'
import { citiesMock } from './geo.mock'

/* Photos for the current user's own listings. */
const PHOTOS = [
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=900&q=70',
]

let jid = 9000
function files(...urls: string[]): CarFileJunction[] {
  return urls.map((url) => {
    const file: DirectusFile = { id: url, filename_download: 'car.jpg' }
    return { id: jid++, directus_files_id: file }
  })
}

const model = (id: number) => modelsMock.find((m) => m.id === id)!
const city = (id: number) => citiesMock.find((c) => c.id === id)!

// Current user as the seller of their own listings.
export const me = {
  id: 'me',
  tg_id: '999000111',
  username: 'me',
  first_name: 'Я',
  last_name: null,
  city: city(1),
}

/**
 * The current user's published listings (active + on moderation). Drafts are not
 * here — they live in localStorage (Архив). In the real API these come from
 * `cars` filtered by the authenticated seller.
 */
export const myCarsMock: CarDetail[] = [
  {
    id: 9001,
    model: model(201), // Mercedes-Benz C-Class
    year: 2019,
    mileage: 72000,
    price: 2680000,
    is_active: true,
    date_created: '2026-05-20T12:30:00',
    views_global: 134,
    likes_global: 9,
    moderation_status: 'approved',
    description: 'Mercedes-Benz C-Class, один владелец, обслужен у дилера.',
    city: city(1),
    seller: me,
    files: files(PHOTOS[1], PHOTOS[0]),
    technical_specs: {
      vehicle_category: 'Легковые',
      body_type: 'Седан',
      engine_volume: 1.6,
      engine_power: 156,
      transmission: 'automatic',
      fuel_type: 'petrol',
      drive_type: 'rwd',
      color: 'Чёрный',
    },
  },
  {
    id: 9002,
    model: model(402), // Toyota RAV4
    year: 2021,
    mileage: 38000,
    price: 3450000,
    is_active: true,
    date_created: '2026-05-18T09:10:00',
    views_global: 67,
    likes_global: 4,
    moderation_status: 'approved',
    description: 'Toyota RAV4, полный привод, на гарантии.',
    city: city(1),
    seller: me,
    files: files(PHOTOS[2]),
    technical_specs: {
      vehicle_category: 'Внедорожники',
      body_type: 'Внедорожник',
      engine_volume: 2.0,
      engine_power: 149,
      transmission: 'cvt',
      fuel_type: 'petrol',
      drive_type: 'awd',
      color: 'Белый',
    },
  },
  {
    id: 9003,
    model: model(103), // BMW 5 серия
    year: 2017,
    mileage: 98000,
    price: 2390000,
    is_active: false,
    date_created: '2026-05-23T16:45:00',
    views_global: 0,
    likes_global: 0,
    moderation_status: 'pending',
    description: 'BMW 5 серия, F10, полностью обслужена.',
    city: city(1),
    seller: me,
    files: files(PHOTOS[3], PHOTOS[0]),
    technical_specs: {
      vehicle_category: 'Легковые',
      body_type: 'Седан',
      engine_volume: 2.0,
      engine_power: 245,
      transmission: 'automatic',
      fuel_type: 'petrol',
      drive_type: 'rwd',
      color: 'Синий',
    },
  },
]

/**
 * Insert or replace one of the current user's listings (publish / edit on mocks).
 * Mirrors the backend persisting to `cars`; keeps getMyCars + getCarById in sync.
 */
export function upsertMyCar(detail: CarDetail): void {
  const i = myCarsMock.findIndex((c) => c.id === detail.id)
  if (i >= 0) myCarsMock.splice(i, 1, detail)
  else myCarsMock.unshift(detail)
}
