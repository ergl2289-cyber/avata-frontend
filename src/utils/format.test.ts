import { describe, it, expect } from 'vitest'
import {
  carTitle,
  formatListingDate,
  formatMileage,
  formatPrice,
  groupThousands,
  moderationLabel,
  transmissionCode,
  transmissionLabel,
} from './format'
import type { CarListItem } from '@/types/car'

const NBSP = ' '

describe('groupThousands', () => {
  it('groups with non-breaking spaces', () => {
    expect(groupThousands(1839000)).toBe(`1${NBSP}839${NBSP}000`)
    expect(groupThousands(999)).toBe('999')
    expect(groupThousands(0)).toBe('0')
  })
})

describe('formatPrice / formatMileage', () => {
  it('appends currency and unit with nbsp', () => {
    expect(formatPrice(1839000)).toBe(`1${NBSP}839${NBSP}000${NBSP}₽`)
    expect(formatMileage(139800)).toBe(`139${NBSP}800${NBSP}км`)
  })
})

describe('transmission helpers', () => {
  it('maps codes', () => {
    expect(transmissionCode('automatic')).toBe('AT')
    expect(transmissionCode('manual')).toBe('MT')
    expect(transmissionCode('robot')).toBe('AMT')
    expect(transmissionCode('cvt')).toBe('CVT')
    expect(transmissionCode(null)).toBe('')
  })
  it('maps full labels', () => {
    expect(transmissionLabel('automatic')).toBe('Автомат')
    expect(transmissionLabel(null)).toBe('—')
  })
})

describe('formatListingDate', () => {
  it('formats as "day genitive-month, HH:MM"', () => {
    expect(formatListingDate('2026-05-17T14:41:00')).toBe('17 мая, 14:41')
    expect(formatListingDate('2026-05-01T17:23:00')).toBe('1 мая, 17:23')
    expect(formatListingDate('2026-01-09T08:05:00')).toBe('9 января, 08:05')
  })
  it('returns empty string for invalid input', () => {
    expect(formatListingDate('not-a-date')).toBe('')
  })
})

describe('moderationLabel', () => {
  it('maps lifecycle statuses to Russian labels', () => {
    expect(moderationLabel('draft')).toBe('Черновик')
    expect(moderationLabel('pending')).toBe('На модерации')
    expect(moderationLabel('approved')).toBe('Активно')
    expect(moderationLabel('rejected')).toBe('Отклонено')
  })
})

describe('carTitle', () => {
  const base = {
    model: { id: 101, name: '3 серия', brand: { id: 1, name: 'BMW' } },
  } as Pick<CarListItem, 'model' | 'technical_specs'>

  it('builds brand + model + volume + gearbox', () => {
    expect(
      carTitle({ ...base, technical_specs: { engine_volume: 2.0, transmission: 'automatic' } }),
    ).toBe('BMW 3 серия 2.0 AT')
  })

  it('omits missing specs gracefully', () => {
    expect(carTitle({ ...base, technical_specs: null })).toBe('BMW 3 серия')
  })
})
