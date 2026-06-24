import type { City, Region } from '@/types/car'

/**
 * Mock geography (dev only — production reads cities from the FastAPI backend).
 * Flat list, no region/district grouping: the picker shows cities directly,
 * matching the millionnik-cities launch model.
 */

export const regionsMock: Region[] = []

/** Major Russian cities, flat (region: null). Ids preserved for mock listings. */
export const citiesMock: City[] = [
  { id: 1, name: 'Москва', region: null },
  { id: 6, name: 'Санкт-Петербург', region: null },
  { id: 10, name: 'Краснодар', region: null },
  { id: 11, name: 'Сочи', region: null },
  { id: 12, name: 'Новороссийск', region: null },
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
  { id: 34, name: 'Хабаровск', region: null },
]
