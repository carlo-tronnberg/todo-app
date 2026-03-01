import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGet, mockPost, mockPatch } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPatch: vi.fn(),
}))

vi.mock('../../../src/api/client', () => ({
  apiClient: { get: mockGet, post: mockPost, patch: mockPatch },
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

describe('authApi.updateProfile', () => {
  it('PATCHes /auth/me and returns updated user', async () => {
    const updated = { ...fakeUser, firstName: 'Alice', lastName: 'Smith' }
    mockPatch.mockResolvedValue({ data: updated })
    const result = await authApi.updateProfile({ firstName: 'Alice', lastName: 'Smith' })
    expect(mockPatch).toHaveBeenCalledWith('/auth/me', { firstName: 'Alice', lastName: 'Smith' })
    expect(result).toEqual(updated)
  })
})

describe('authApi.changePassword', () => {
  it('PATCHes /auth/password', async () => {
    mockPatch.mockResolvedValue({ data: undefined })
    await authApi.changePassword({ oldPassword: 'old123', newPassword: 'new456' })
    expect(mockPatch).toHaveBeenCalledWith('/auth/password', {
      oldPassword: 'old123',
      newPassword: 'new456',
    })
  })
})

describe('authApi.getAuditLog', () => {
  it('GETs /audit and returns entries', async () => {
    const fakeEntries = [{ id: 'a1', action: 'item.create', entityType: 'todo_item' }]
    mockGet.mockResolvedValue({ data: fakeEntries })
    const result = await authApi.getAuditLog()
    expect(mockGet).toHaveBeenCalledWith('/audit', { params: undefined })
    expect(result).toEqual(fakeEntries)
  })

  it('passes limit and offset params', async () => {
    mockGet.mockResolvedValue({ data: [] })
    await authApi.getAuditLog({ limit: 10, offset: 20 })
    expect(mockGet).toHaveBeenCalledWith('/audit', { params: { limit: 10, offset: 20 } })
  })
})
