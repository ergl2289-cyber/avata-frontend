import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFavoritesStore } from './favorites'

describe('favorites store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('toggle adds new likes to the front (newest first) and reports membership', async () => {
    const fav = useFavoritesStore()
    await fav.toggle(1)
    await fav.toggle(2)
    expect(fav.ids).toEqual([2, 1])
    expect(fav.isLiked(1)).toBe(true)
    expect(fav.isLiked(99)).toBe(false)
    expect(fav.count).toBe(2)
  })

  it('toggle removes an already-liked id', async () => {
    const fav = useFavoritesStore()
    await fav.toggle(1)
    expect(await fav.toggle(1)).toBe(false)
    expect(fav.ids).toEqual([])
    expect(fav.count).toBe(0)
  })

  it('persists ids to localStorage', async () => {
    const fav = useFavoritesStore()
    await fav.toggle(7)
    expect(JSON.parse(localStorage.getItem('avata:favorites') ?? '[]')).toEqual([7])
  })

  it('loadItems fetches full card data in favorites order', async () => {
    const fav = useFavoritesStore()
    await fav.toggle(2)
    await fav.toggle(5) // ids = [5, 2]
    await fav.loadItems()
    expect(fav.items.map((c) => c.id)).toEqual([5, 2])
    expect(fav.loading).toBe(false)
  })

  it('remove drops the id from both ids and items', async () => {
    const fav = useFavoritesStore()
    await fav.toggle(2)
    await fav.toggle(5)
    await fav.loadItems()
    await fav.remove(2)
    expect(fav.ids).toEqual([5])
    expect(fav.items.map((c) => c.id)).toEqual([5])
  })
})
