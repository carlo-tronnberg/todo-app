import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGet, mockPatch } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPatch: vi.fn(),
}))

vi.mock('../../../src/api/client', () => ({
  apiClient: { get: mockGet, patch: mockPatch },
}))

import { adminApi } from '../../../src/api/admin.api'

beforeEach(() => vi.clearAllMocks())

describe('adminApi.getUsers', () => {
  it('GETs /admin/users', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'u1', username: 'alice' }] })
    const result = await adminApi.getUsers()
    expect(mockGet).toHaveBeenCalledWith('/admin/users')
    expect(result).toEqual([{ id: 'u1', username: 'alice' }])
  })
})

describe('adminApi.updateUser', () => {
  it('PATCHes /admin/users/:userId', async () => {
    mockPatch.mockResolvedValue({ data: { id: 'u1', isAdmin: true } })
    const result = await adminApi.updateUser('u1', { isAdmin: true })
    expect(mockPatch).toHaveBeenCalledWith('/admin/users/u1', { isAdmin: true })
    expect(result.isAdmin).toBe(true)
  })
})
