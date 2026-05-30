import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useProfileStore } from './profile'

describe('profile store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('starts with no city', () => {
    const p = useProfileStore()
    expect(p.cityId).toBeNull()
    expect(p.cityName).toBeNull()
  })

  it('setCity stores id + name and persists', () => {
    const p = useProfileStore()
    p.setCity({ id: 11, name: 'Сочи', region: null })
    expect(p.cityId).toBe(11)
    expect(p.cityName).toBe('Сочи')
    expect(JSON.parse(localStorage.getItem('avata:city') ?? '{}')).toEqual({ id: 11, name: 'Сочи' })
  })

  it('restores the persisted city on init', () => {
    localStorage.setItem('avata:city', JSON.stringify({ id: 1, name: 'Москва' }))
    setActivePinia(createPinia())
    const p = useProfileStore()
    expect(p.cityName).toBe('Москва')
  })
})
