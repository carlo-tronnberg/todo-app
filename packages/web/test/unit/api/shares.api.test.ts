import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGet, mockPost, mockPatch, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPatch: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock('../../../src/api/client', () => ({
  apiClient: { get: mockGet, post: mockPost, patch: mockPatch, delete: mockDelete },
}))

import { sharesApi } from '../../../src/api/shares.api'

beforeEach(() => vi.clearAllMocks())

const fakeShare = {
  id: 's1',
  role: 'editor',
  createdAt: '2026-04-06T00:00:00Z',
  user: {
    id: 'u2',
    email: 'bob@example.com',
    username: 'bob',
    firstName: 'Bob',
    lastName: null,
    avatarUrl: null,
  },
}

describe('sharesApi.getAll', () => {
  it('GETs /lists/:listId/shares', async () => {
    mockGet.mockResolvedValue({ data: [fakeShare] })
    const result = await sharesApi.getAll('l1')
    expect(mockGet).toHaveBeenCalledWith('/lists/l1/shares')
    expect(result).toEqual([fakeShare])
  })
})

describe('sharesApi.create', () => {
  it('POSTs to /lists/:listId/shares with email and role', async () => {
    mockPost.mockResolvedValue({ data: fakeShare })
    const result = await sharesApi.create('l1', 'bob@example.com')
    expect(mockPost).toHaveBeenCalledWith('/lists/l1/shares', {
      emailOrUsername: 'bob@example.com',
      role: 'editor',
    })
    expect(result).toEqual(fakeShare)
  })
})

describe('sharesApi.updateRole', () => {
  it('PATCHes /lists/:listId/shares/:shareId with role', async () => {
    mockPatch.mockResolvedValue({})
    await sharesApi.updateRole('l1', 's1', 'viewer')
    expect(mockPatch).toHaveBeenCalledWith('/lists/l1/shares/s1', { role: 'viewer' })
  })
})

describe('sharesApi.remove', () => {
  it('DELETEs /lists/:listId/shares/:shareId', async () => {
    mockDelete.mockResolvedValue({})
    await sharesApi.remove('l1', 's1')
    expect(mockDelete).toHaveBeenCalledWith('/lists/l1/shares/s1')
  })
})
