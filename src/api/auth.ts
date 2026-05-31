const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const JWT_KEY = 'avata:jwt'

export function getToken(): string | null {
  return localStorage.getItem(JWT_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(JWT_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(JWT_KEY)
}

export function isLoggedIn(): boolean {
  return getToken() !== null
}

export async function login(initData: string): Promise<string> {
  const resp = await fetch(`${API_URL}/api/auth/telegram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ init_data: initData }),
  })
  if (!resp.ok) {
    throw new Error(`Auth failed: ${resp.status}`)
  }
  const data = await resp.json()
  setToken(data.token)
  return data.token
}

export async function loginTest(tgId: number): Promise<string> {
  const resp = await fetch(`${API_URL}/api/auth/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tg_id: tgId }),
  })
  if (!resp.ok) {
    throw new Error(`Test auth failed: ${resp.status}`)
  }
  const data = await resp.json()
  setToken(data.token)
  return data.token
}

export interface WidgetUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export async function loginWidget(user: WidgetUser): Promise<string> {
  const resp = await fetch(`${API_URL}/api/auth/widget`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  })
  if (!resp.ok) {
    throw new Error(`Widget auth failed: ${resp.status}`)
  }
  const data = await resp.json()
  setToken(data.token)
  return data.token
}

export function logout(): void {
  clearToken()
}
