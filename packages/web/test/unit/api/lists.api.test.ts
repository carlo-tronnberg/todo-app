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

import { listsApi } from '../../../src/api/lists.api'

const fakeList = {
  id: 'l1',
  userId: 'u1',
  title: 'My List',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
}
const fakeItem = {
  id: 'i1',
  listId: 'l1',
  title: 'Task',
  isArchived: false,
  sortOrder: 0,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
}

beforeEach(() => vi.clearAllMocks())

describe('listsApi.getAll', () => {
  it('GETs /lists', async () => {
    mockGet.mockResolvedValue({ data: [fakeList] })
    const result = await listsApi.getAll()
    expect(mockGet).toHaveBeenCalledWith('/lists')
    expect(result).toEqual([fakeList])
  })
})

describe('listsApi.getOne', () => {
  it('GETs /lists/:id', async () => {
    mockGet.mockResolvedValue({ data: fakeList })
    const result = await listsApi.getOne('l1')
    expect(mockGet).toHaveBeenCalledWith('/lists/l1')
    expect(result).toEqual(fakeList)
  })
})

describe('listsApi.create', () => {
  it('POSTs to /lists with title and optional description', async () => {
    mockPost.mockResolvedValue({ data: fakeList })
    const result = await listsApi.create({ title: 'My List', description: 'desc' })
    expect(mockPost).toHaveBeenCalledWith('/lists', { title: 'My List', description: 'desc' })
    expect(result).toEqual(fakeList)
  })
})

describe('listsApi.update', () => {
  it('PATCHes /lists/:id', async () => {
    const updated = { ...fakeList, title: 'Updated' }
    mockPatch.mockResolvedValue({ data: updated })
    const result = await listsApi.update('l1', { title: 'Updated' })
    expect(mockPatch).toHaveBeenCalledWith('/lists/l1', { title: 'Updated' })
    expect(result).toEqual(updated)
  })
})

describe('listsApi.delete', () => {
  it('DELETEs /lists/:id', async () => {
    mockDelete.mockResolvedValue({})
    await listsApi.delete('l1')
    expect(mockDelete).toHaveBeenCalledWith('/lists/l1')
  })
})

describe('listsApi.getItems', () => {
  it('GETs /lists/:listId/items', async () => {
    mockGet.mockResolvedValue({ data: [fakeItem] })
    const result = await listsApi.getItems('l1')
    expect(mockGet).toHaveBeenCalledWith('/lists/l1/items')
    expect(result).toEqual([fakeItem])
  })
})

describe('listsApi.createItem', () => {
  it('POSTs to /lists/:listId/items', async () => {
    mockPost.mockResolvedValue({ data: fakeItem })
    const result = await listsApi.createItem('l1', { title: 'Task' })
    expect(mockPost).toHaveBeenCalledWith('/lists/l1/items', { title: 'Task' })
    expect(result).toEqual(fakeItem)
  })
})
