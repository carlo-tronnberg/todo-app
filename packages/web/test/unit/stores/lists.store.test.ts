import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const { mockListsApi } = vi.hoisted(() => ({
  mockListsApi: {
    getAll: vi.fn(),
    getOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getItems: vi.fn(),
    createItem: vi.fn(),
  },
}))

vi.mock('../../../src/api/lists.api', () => ({ listsApi: mockListsApi }))

import { useListsStore } from '../../../src/stores/lists.store'

const fakeList = (id: string, title = 'List') => ({
  id,
  userId: 'u1',
  title,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('fetchLists()', () => {
  it('populates lists on success', async () => {
    mockListsApi.getAll.mockResolvedValue([fakeList('l1')])
    const store = useListsStore()
    await store.fetchLists()
    expect(store.lists).toEqual([fakeList('l1')])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('sets loading=true during fetch then resets to false', async () => {
    let resolveGet!: (v: any) => void
    mockListsApi.getAll.mockReturnValue(new Promise((r) => (resolveGet = r)))
    const store = useListsStore()
    const p = store.fetchLists()
    expect(store.loading).toBe(true)
    resolveGet([])
    await p
    expect(store.loading).toBe(false)
  })

  it('sets error on failure', async () => {
    mockListsApi.getAll.mockRejectedValue(new Error('Network'))
    const store = useListsStore()
    await store.fetchLists()
    expect(store.error).toBe('Failed to load lists')
    expect(store.loading).toBe(false)
  })
})

describe('createList()', () => {
  it('appends new list to the store', async () => {
    const newList = fakeList('l2', 'New List')
    mockListsApi.create.mockResolvedValue(newList)
    const store = useListsStore()
    const result = await store.createList('New List', 'desc')
    expect(mockListsApi.create).toHaveBeenCalledWith({ title: 'New List', description: 'desc' })
    expect(store.lists).toContainEqual(newList)
    expect(result).toEqual(newList)
  })
})

describe('updateList()', () => {
  it('replaces list in-place by id', async () => {
    const original = fakeList('l1', 'Old Title')
    const updated = fakeList('l1', 'New Title')
    mockListsApi.getAll.mockResolvedValue([original])
    mockListsApi.update.mockResolvedValue(updated)
    const store = useListsStore()
    await store.fetchLists()
    const result = await store.updateList('l1', { title: 'New Title' })
    expect(store.lists[0].title).toBe('New Title')
    expect(result).toEqual(updated)
  })

  it('does not crash when id is not found in local lists', async () => {
    mockListsApi.update.mockResolvedValue(fakeList('l99', 'Ghost'))
    const store = useListsStore()
    await expect(store.updateList('l99', { title: 'Ghost' })).resolves.toBeDefined()
  })
})

describe('deleteList()', () => {
  it('removes the list from the store', async () => {
    mockListsApi.getAll.mockResolvedValue([fakeList('l1'), fakeList('l2')])
    mockListsApi.delete.mockResolvedValue(undefined)
    const store = useListsStore()
    await store.fetchLists()
    await store.deleteList('l1')
    expect(store.lists.map((l) => l.id)).toEqual(['l2'])
  })
})
