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

import { itemsApi } from '../../../src/api/items.api'

const fakeItem = {
  id: 'i1',
  listId: 'l1',
  title: 'Task',
  isArchived: false,
  sortOrder: 0,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
}
const fakeCompletion = {
  id: 'c1',
  itemId: 'i1',
  completedAt: '2024-06-15T12:00:00Z',
}

beforeEach(() => vi.clearAllMocks())

describe('itemsApi.getOne', () => {
  it('GETs /items/:id', async () => {
    mockGet.mockResolvedValue({ data: fakeItem })
    const result = await itemsApi.getOne('i1')
    expect(mockGet).toHaveBeenCalledWith('/items/i1')
    expect(result).toEqual(fakeItem)
  })
})

describe('itemsApi.update', () => {
  it('PATCHes /items/:id', async () => {
    const updated = { ...fakeItem, title: 'Updated Task' }
    mockPatch.mockResolvedValue({ data: updated })
    const result = await itemsApi.update('i1', { title: 'Updated Task' })
    expect(mockPatch).toHaveBeenCalledWith('/items/i1', { title: 'Updated Task' })
    expect(result).toEqual(updated)
  })
})

describe('itemsApi.archive', () => {
  it('DELETEs /items/:id', async () => {
    mockDelete.mockResolvedValue({})
    await itemsApi.archive('i1')
    expect(mockDelete).toHaveBeenCalledWith('/items/i1')
  })
})

describe('itemsApi.complete', () => {
  it('POSTs to /items/:id/complete without note', async () => {
    mockPost.mockResolvedValue({ data: fakeCompletion })
    const result = await itemsApi.complete('i1')
    expect(mockPost).toHaveBeenCalledWith('/items/i1/complete', { note: undefined })
    expect(result).toEqual(fakeCompletion)
  })

  it('POSTs to /items/:id/complete with note', async () => {
    mockPost.mockResolvedValue({ data: { ...fakeCompletion, note: 'Done early' } })
    const result = await itemsApi.complete('i1', 'Done early')
    expect(mockPost).toHaveBeenCalledWith('/items/i1/complete', { note: 'Done early' })
    expect(result.note).toBe('Done early')
  })
})

describe('itemsApi.getCompletions', () => {
  it('GETs /items/:id/completions', async () => {
    mockGet.mockResolvedValue({ data: [fakeCompletion] })
    const result = await itemsApi.getCompletions('i1')
    expect(mockGet).toHaveBeenCalledWith('/items/i1/completions')
    expect(result).toEqual([fakeCompletion])
  })
})

describe('itemsApi.deleteCompletion', () => {
  it('DELETEs /completions/:completionId', async () => {
    mockDelete.mockResolvedValue({})
    await itemsApi.deleteCompletion('c1')
    expect(mockDelete).toHaveBeenCalledWith('/completions/c1')
  })
})
