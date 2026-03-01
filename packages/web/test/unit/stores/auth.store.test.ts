import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const { mockAuthApi } = vi.hoisted(() => ({
  mockAuthApi: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
  },
}))

vi.mock('../../../src/api/auth.api', () => ({ authApi: mockAuthApi }))

import { useAuthStore } from '../../../src/stores/auth.store'

const fakeUser = { id: 'u1', email: 'a@b.com', username: 'alice', createdAt: '2024-01-01' }
const fakeAuthResponse = { token: 'jwt-token', user: fakeUser }

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.clearAllMocks()
})

describe('initial state', () => {
  it('reads token from localStorage if present', () => {
    localStorage.setItem('auth_token', 'stored-token')
    setActivePinia(createPinia())
    const store = useAuthStore()
    expect(store.token).toBe('stored-token')
    expect(store.isAuthenticated).toBe(true)
  })

  it('token is null when localStorage is empty', () => {
    const store = useAuthStore()
    expect(store.token).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })
})

describe('login()', () => {
  it('sets token and user on success', async () => {
    mockAuthApi.login.mockResolvedValue(fakeAuthResponse)
    const store = useAuthStore()
    await store.login('a@b.com', 'pass')
    expect(store.token).toBe('jwt-token')
    expect(store.user).toEqual(fakeUser)
    expect(localStorage.getItem('auth_token')).toBe('jwt-token')
  })

  it('propagates error on failure', async () => {
    mockAuthApi.login.mockRejectedValue(new Error('INVALID_CREDENTIALS'))
    const store = useAuthStore()
    await expect(store.login('bad@email.com', 'wrong')).rejects.toThrow('INVALID_CREDENTIALS')
    expect(store.token).toBeNull()
  })
})

describe('register()', () => {
  it('sets token and user on success', async () => {
    mockAuthApi.register.mockResolvedValue(fakeAuthResponse)
    const store = useAuthStore()
    await store.register('a@b.com', 'alice', 'pass1234')
    expect(store.token).toBe('jwt-token')
    expect(store.user).toEqual(fakeUser)
    expect(localStorage.getItem('auth_token')).toBe('jwt-token')
  })

  it('propagates error on failure', async () => {
    mockAuthApi.register.mockRejectedValue(new Error('EMAIL_TAKEN'))
    const store = useAuthStore()
    await expect(store.register('taken@email.com', 'u', 'pass1234')).rejects.toThrow('EMAIL_TAKEN')
  })
})

describe('fetchMe()', () => {
  it('does nothing when not authenticated (no token)', async () => {
    const store = useAuthStore()
    await store.fetchMe()
    expect(mockAuthApi.me).not.toHaveBeenCalled()
    expect(store.user).toBeNull()
  })

  it('sets user when token is present', async () => {
    mockAuthApi.me.mockResolvedValue(fakeUser)
    localStorage.setItem('auth_token', 'valid-token')
    setActivePinia(createPinia())
    const store = useAuthStore()
    await store.fetchMe()
    expect(mockAuthApi.me).toHaveBeenCalled()
    expect(store.user).toEqual(fakeUser)
  })

  it('calls logout() when me() throws', async () => {
    mockAuthApi.me.mockRejectedValue(new Error('Unauthorized'))
    localStorage.setItem('auth_token', 'expired-token')
    setActivePinia(createPinia())
    const store = useAuthStore()
    await store.fetchMe()
    expect(store.user).toBeNull()
    expect(store.token).toBeNull()
    expect(localStorage.getItem('auth_token')).toBeNull()
  })
})

describe('logout()', () => {
  it('clears user, token and localStorage', async () => {
    mockAuthApi.login.mockResolvedValue(fakeAuthResponse)
    const store = useAuthStore()
    await store.login('a@b.com', 'pass')
    store.logout()
    expect(store.user).toBeNull()
    expect(store.token).toBeNull()
    expect(localStorage.getItem('auth_token')).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })
})
