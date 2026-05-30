import { describe, it, expect } from 'vitest'
import { getCars, getCarById, getCarsByIds, getMyCars } from './cars.service'

describe('getCars (feed, mock = Directus shape)', () => {
  it('returns a { data, meta } envelope', async () => {
    const res = await getCars({ limit: 4, offset: 0 })
    expect(Array.isArray(res.data)).toBe(true)
    expect(res.data.length).toBe(4)
    expect(res.meta?.filter_count).toBeGreaterThan(0)
  })

  it('returns lightweight items (no detail-only fields)', async () => {
    const res = await getCars({ limit: 1, offset: 0 })
    const item = res.data[0] as unknown as Record<string, unknown>
    // present
    expect(item.price).toBeDefined()
    expect(item.model).toBeDefined()
    expect((item.model as { brand: unknown }).brand).toBeDefined()
    // projected away (detail-only)
    expect(item.description).toBeUndefined()
    expect(item.seller).toBeUndefined()
  })

  it('paginates via offset/limit without overlap', async () => {
    const p1 = await getCars({ limit: 4, offset: 0 })
    const p2 = await getCars({ limit: 4, offset: 4 })
    const ids1 = p1.data.map((c) => c.id)
    const ids2 = p2.data.map((c) => c.id)
    expect(ids1.some((id) => ids2.includes(id))).toBe(false)
  })

  it('filters by brandId', async () => {
    const res = await getCars({ limit: 50, offset: 0, brandId: 1 }) // BMW
    expect(res.data.length).toBeGreaterThan(0)
    expect(res.data.every((c) => c.model.brand.id === 1)).toBe(true)
  })

  it('filters by price range', async () => {
    const res = await getCars({ limit: 50, offset: 0, priceFrom: 2_000_000, priceTo: 3_000_000 })
    expect(res.data.every((c) => c.price >= 2_000_000 && c.price <= 3_000_000)).toBe(true)
  })
})

describe('getCarsByIds (favorites)', () => {
  it('returns a { data } envelope with only the requested ids', async () => {
    const res = await getCarsByIds([3, 1])
    expect(res.data.map((c) => c.id).sort()).toEqual([1, 3])
  })

  it('preserves the requested order (favorites order)', async () => {
    const res = await getCarsByIds([5, 2, 8])
    expect(res.data.map((c) => c.id)).toEqual([5, 2, 8])
  })

  it('includes date_created on list items', async () => {
    const res = await getCarsByIds([1])
    expect(res.data[0].date_created).toBeTypeOf('string')
  })

  it('resolves to an empty list for no ids (no request)', async () => {
    const res = await getCarsByIds([])
    expect(res.data).toEqual([])
  })
})

describe('getMyCars (my listings)', () => {
  it('returns a { data } envelope with status + stats', async () => {
    const res = await getMyCars()
    expect(res.data.length).toBeGreaterThan(0)
    const item = res.data[0]
    expect(item.moderation_status).toBeTypeOf('string')
    expect(item.views_global).toBeTypeOf('number')
    expect(item.likes_global).toBeTypeOf('number')
  })

  it('includes both approved and pending listings', async () => {
    const res = await getMyCars()
    const statuses = new Set(res.data.map((c) => c.moderation_status))
    expect(statuses.has('approved')).toBe(true)
    expect(statuses.has('pending')).toBe(true)
  })
})

describe('getCarById (full detail)', () => {
  it('returns a single { data } envelope with deep fields', async () => {
    const res = await getCarById(1)
    expect(res.data.id).toBe(1)
    expect(res.data.seller).toBeDefined()
    expect(res.data.description).toBeTypeOf('string')
    expect(res.data.technical_specs?.engine_power).toBeDefined()
  })

  it('rejects for an unknown id', async () => {
    await expect(getCarById(99999)).rejects.toThrow()
  })
})
