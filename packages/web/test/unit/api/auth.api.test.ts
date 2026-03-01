import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}))

vi.mock('../../../src/api/client', () => ({
  apiClient: { get: mockGet, post: mockPost },
}))

import { authApi } from '../../../src/api/auth.api'

const fakeUser = { id: '1', email: 'a@b.com', username: 'alice', createdAt: '2024-01-01' }
const fakeAuthResponse = { token: 'tok', user: fakeUser }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('authApi.register', () => {
  it('POSTs to /auth/register and returns data', async () => {
    mockPost.mockResolvedValue({ data: fakeAuthResponse })
    const result = await authApi.register({
      email: 'a@b.com',
      username: 'alice',
      password: 'secret123',
    })
    expect(mockPost).toHaveBeenCalledWith('/auth/register', {
      email: 'a@b.com',
      username: 'alice',
      password: 'secret123',
    })
    expect(result).toEqual(fakeAuthResponse)
  })
})

describe('authApi.login', () => {
  it('POSTs to /auth/login and returns data', async () => {
    mockPost.mockResolvedValue({ data: fakeAuthResponse })
    const result = await authApi.login({ email: 'a@b.com', password: 'secret123' })
    expect(mockPost).toHaveBeenCalledWith('/auth/login', {
      email: 'a@b.com',
      password: 'secret123',
    })
    expect(result).toEqual(fakeAuthResponse)
  })
})

describe('authApi.me', () => {
  it('GETs /auth/me and returns user data', async () => {
    mockGet.mockResolvedValue({ data: fakeUser })
    const result = await authApi.me()
    expect(mockGet).toHaveBeenCalledWith('/auth/me')
    expect(result).toEqual(fakeUser)
  })
})
