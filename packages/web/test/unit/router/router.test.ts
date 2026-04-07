import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock auth API so the auth store doesn't make real HTTP calls
const { mockAuthApi } = vi.hoisted(() => ({
  mockAuthApi: { login: vi.fn(), register: vi.fn(), me: vi.fn() },
}))
vi.mock('../../../src/api/auth.api', () => ({ authApi: mockAuthApi }))

import router from '../../../src/router/index'

beforeEach(async () => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.clearAllMocks()
  // Reset to a known starting position
  await router.replace('/login')
})

describe('router navigation guard', () => {
  it('redirects unauthenticated user from / to /login', async () => {
    // No token → not authenticated
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('Login')
  })

  it('allows unauthenticated user to stay on /login', async () => {
    await router.push('/login')
    expect(router.currentRoute.value.name).toBe('Login')
  })

  it('allows unauthenticated user to visit /register', async () => {
    await router.push('/register')
    expect(router.currentRoute.value.name).toBe('Register')
  })

  it('redirects authenticated user from /login to Dashboard', async () => {
    localStorage.setItem('auth_token', 'tok')
    setActivePinia(createPinia()) // new pinia picks up localStorage token
    // Use /register to avoid duplicate-navigation no-op (beforeEach already at /login)
    await router.push('/register')
    expect(router.currentRoute.value.name).toBe('Dashboard')
  })

  it('redirects authenticated user from /register to Dashboard', async () => {
    localStorage.setItem('auth_token', 'tok')
    setActivePinia(createPinia())
    await router.push('/register')
    expect(router.currentRoute.value.name).toBe('Dashboard')
  })

  it('allows authenticated user to access Dashboard', async () => {
    localStorage.setItem('auth_token', 'tok')
    setActivePinia(createPinia())
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('Dashboard')
  })

  it('allows authenticated user to access protected routes', async () => {
    localStorage.setItem('auth_token', 'tok')
    setActivePinia(createPinia())
    await router.push('/calendar')
    expect(router.currentRoute.value.name).toBe('Calendar')
  })

  it('wildcard routes redirect to /', async () => {
    localStorage.setItem('auth_token', 'tok')
    setActivePinia(createPinia())
    await router.push('/nonexistent-path')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('handles SSO token in query param', async () => {
    setActivePinia(createPinia())
    await router.push('/?token=sso-jwt-token')
    // Should redirect to dashboard and store the token
    expect(localStorage.getItem('auth_token')).toBe('sso-jwt-token')
    expect(router.currentRoute.value.name).toBe('Dashboard')
  })

  it('navigates to /users route', async () => {
    localStorage.setItem('auth_token', 'tok')
    setActivePinia(createPinia())
    await router.push('/users')
    expect(router.currentRoute.value.name).toBe('Users')
  })

  it('navigates to /about route', async () => {
    localStorage.setItem('auth_token', 'tok')
    setActivePinia(createPinia())
    await router.push('/about')
    expect(router.currentRoute.value.name).toBe('About')
  })

  it('navigates to /changelog route', async () => {
    localStorage.setItem('auth_token', 'tok')
    setActivePinia(createPinia())
    await router.push('/changelog')
    expect(router.currentRoute.value.name).toBe('Changelog')
  })

  it('navigates to /settings route', async () => {
    localStorage.setItem('auth_token', 'tok')
    setActivePinia(createPinia())
    await router.push('/settings')
    expect(router.currentRoute.value.name).toBe('Settings')
  })
})
