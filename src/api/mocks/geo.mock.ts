import type { City, Region } from '@/types/car'

/**
 * Mock geography. Regions exist for the three areas that use a two-level
 * (region -> city) picker: Москва, Санкт-Петербург, Краснодарский край.
 * All other major cities select directly (region is still present as a parent
 * for Directus shape parity, but the UI treats them as a single-level choice).
 */

export const regionsMock: Region[] = [
  { id: 1, name: 'Москва и область' },
  { id: 2, name: 'Санкт-Петербург и область' },
  { id: 3, name: 'Краснодарский край' },
]

const r = (id: number): Region | null => regionsMock.find((x) => x.id === id) ?? null

/** 34 major Russian cities. Two-level regions get several child cities. */
export const citiesMock: City[] = [
  // --- Москва и область (two-level) ---
  { id: 1, name: 'Москва', region: r(1) },
  { id: 2, name: 'Химки', region: r(1) },
  { id: 3, name: 'Подольск', region: r(1) },
  { id: 4, name: 'Балашиха', region: r(1) },
  { id: 5, name: 'Мытищи', region: r(1) },

  // --- Санкт-Петербург и область (two-level) ---
  { id: 6, name: 'Санкт-Петербург', region: r(2) },
  { id: 7, name: 'Пушкин', region: r(2) },
  { id: 8, name: 'Гатчина', region: r(2) },
  { id: 9, name: 'Выборг', region: r(2) },

  // --- Краснодарский край (two-level) ---
  { id: 10, name: 'Краснодар', region: r(3) },
  { id: 11, name: 'Сочи', region: r(3) },
  { id: 12, name: 'Новороссийск', region: r(3) },
  { id: 13, name: 'Анапа', region: r(3) },
  { id: 14, name: 'Армавир', region: r(3) },

  // --- Single-level cities ---
  { id: 15, name: 'Новосибирск', region: null },
  { id: 16, name: 'Екатеринбург', region: null },
  { id: 17, name: 'Казань', region: null },
  { id: 18, name: 'Нижний Новгород', region: null },
  { id: 19, name: 'Челябинск', region: null },
  { id: 20, name: 'Самара', region: null },
  { id: 21, name: 'Омск', region: null },
  { id: 22, name: 'Ростов-на-Дону', region: null },
  { id: 23, name: 'Уфа', region: null },
  { id: 24, name: 'Красноярск', region: null },
  { id: 25, name: 'Воронеж', region: null },
  { id: 26, name: 'Пермь', region: null },
  { id: 27, name: 'Волгоград', region: null },
  { id: 28, name: 'Саратов', region: null },
  { id: 29, name: 'Тюмень', region: null },
  { id: 30, name: 'Тольятти', region: null },
  { id: 31, name: 'Ижевск', region: null },
  { id: 32, name: 'Барнаул', region: null },
  { id: 33, name: 'Иркутск', region: null },
  { id: 34, name: 'Хабаровск', region: null },
]

/** Two-level region ids (UI shows region -> city drill-down for these). */
export const twoLevelRegionIds = [1, 2, 3]
