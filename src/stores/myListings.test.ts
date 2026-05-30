import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMyListingsStore } from './myListings'
import { emptyListingForm } from '@/types/listing'

function sampleForm() {
  return {
    ...emptyListingForm(),
    brandId: 1,
    modelId: 101, // BMW 3 серия
    year: 2020,
    mileage: 50000,
    price: 2000000,
    cityId: 1,
  }
}

describe('myListings store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('saveDraft persists to localStorage with a derived title', () => {
    const s = useMyListingsStore()
    const id = s.saveDraft(sampleForm())
    expect(s.drafts).toHaveLength(1)
    expect(s.drafts[0].title).toBe('BMW 3 серия')
    const stored = JSON.parse(localStorage.getItem('avata:drafts') ?? '[]')
    expect(stored[0].id).toBe(id)
  })

  it('saveDraft with same id updates in place (no duplicate)', () => {
    const s = useMyListingsStore()
    const id = s.saveDraft(sampleForm())
    s.saveDraft({ ...sampleForm(), price: 2500000 }, id)
    expect(s.drafts).toHaveLength(1)
    expect(s.drafts[0].form.price).toBe(2500000)
  })

  it('deleteDraft removes it', () => {
    const s = useMyListingsStore()
    const id = s.saveDraft(sampleForm())
    s.deleteDraft(id)
    expect(s.drafts).toHaveLength(0)
  })

  it('load groups published listings into active and moderation', async () => {
    const s = useMyListingsStore()
    await s.load()
    expect(s.active.length).toBeGreaterThan(0)
    expect(s.moderation.length).toBeGreaterThan(0)
    expect(s.active.every((c) => c.moderation_status === 'approved')).toBe(true)
    expect(s.moderation.every((c) => c.moderation_status === 'pending')).toBe(true)
  })

  it('publish removes the draft and adds a pending listing', async () => {
    const s = useMyListingsStore()
    await s.load()
    const beforeModeration = s.moderation.length
    const id = s.saveDraft(sampleForm())
    s.publish(sampleForm(), id)
    expect(s.drafts).toHaveLength(0)
    expect(s.moderation.length).toBe(beforeModeration + 1)
    expect(s.moderation[0].moderation_status).toBe('pending')
  })

  it('counts reflect drafts and statuses', async () => {
    const s = useMyListingsStore()
    await s.load()
    s.saveDraft(sampleForm())
    expect(s.counts.archive).toBe(1)
    expect(s.counts.active).toBe(s.active.length)
    expect(s.counts.moderation).toBe(s.moderation.length)
  })
})
