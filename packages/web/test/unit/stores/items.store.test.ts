import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const { mockListsApi, mockItemsApi } = vi.hoisted(() => ({
  mockListsApi: {
    getItems: vi.fn(),
    createItem: vi.fn(),
  },
  mockItemsApi: {
    getOne: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    complete: vi.fn(),
  },
}))

vi.mock('../../../src/api/lists.api', () => ({ listsApi: mockListsApi }))
vi.mock('../../../src/api/items.api', () => ({ itemsApi: mockItemsApi }))

import { useItemsStore } from '../../../src/stores/items.store'
import type { TodoItem } from '../../../src/types'

function fakeItem(id: string, title = 'Task'): TodoItem {
  return {
    id,
    listId: 'l1',
    title,
    isArchived: false,
    sortOrder: 0,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  }
}

const fakeCompletion = { id: 'c1', itemId: 'i1', completedAt: '2024-06-15T12:00:00Z' }

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('fetchItems()', () => {
  it('populates itemsByList for the given listId', async () => {
    mockListsApi.getItems.mockResolvedValue([fakeItem('i1'), fakeItem('i2')])
    const store = useItemsStore()
    await store.fetchItems('l1')
    expect(store.itemsByList['l1']).toHaveLength(2)
    expect(store.loading).toBe(false)
  })

  it('sets loading=true during fetch', async () => {
    let resolve!: (v: any) => void
    mockListsApi.getItems.mockReturnValue(new Promise((r) => (resolve = r)))
    const store = useItemsStore()
    const p = store.fetchItems('l1')
    expect(store.loading).toBe(true)
    resolve([])
    await p
    expect(store.loading).toBe(false)
  })
})

describe('createItem()', () => {
  it('initialises empty array for a new listId then pushes the item', async () => {
    const newItem = fakeItem('i1', 'New Task')
    mockListsApi.createItem.mockResolvedValue(newItem)
    const store = useItemsStore()
    const result = await store.createItem('l1', { title: 'New Task' })
    expect(store.itemsByList['l1']).toEqual([newItem])
    expect(result).toEqual(newItem)
  })

  it('appends to an existing array', async () => {
    mockListsApi.getItems.mockResolvedValue([fakeItem('i1')])
    const newItem = fakeItem('i2', 'Second Task')
    mockListsApi.createItem.mockResolvedValue(newItem)
    const store = useItemsStore()
    await store.fetchItems('l1')
    await store.createItem('l1', { title: 'Second Task' })
    expect(store.itemsByList['l1']).toHaveLength(2)
  })
})

describe('updateItem()', () => {
  it('replaces the item in itemsByList', async () => {
    mockListsApi.getItems.mockResolvedValue([fakeItem('i1', 'Old')])
    const updated = fakeItem('i1', 'New Title')
    mockItemsApi.update.mockResolvedValue(updated)
    const store = useItemsStore()
    await store.fetchItems('l1')
    const result = await store.updateItem('l1', 'i1', { title: 'New Title' })
    expect(store.itemsByList['l1'][0].title).toBe('New Title')
    expect(result).toEqual(updated)
  })

  it('does nothing to the store when listId is not loaded', async () => {
    const updated = fakeItem('i99', 'Ghost')
    mockItemsApi.update.mockResolvedValue(updated)
    const store = useItemsStore()
    await expect(store.updateItem('l1', 'i99', { title: 'Ghost' })).resolves.toEqual(updated)
  })
})

describe('completeItem()', () => {
  it('calls complete then refreshes the item', async () => {
    const refreshed = { ...fakeItem('i1'), dueDate: '2024-07-15T00:00:00Z' }
    mockListsApi.getItems.mockResolvedValue([fakeItem('i1')])
    mockItemsApi.complete.mockResolvedValue(fakeCompletion)
    mockItemsApi.getOne.mockResolvedValue(refreshed)
    const store = useItemsStore()
    await store.fetchItems('l1')
    const completion = await store.completeItem('l1', 'i1', 'done note')
    expect(mockItemsApi.complete).toHaveBeenCalledWith('i1', 'done note')
    expect(mockItemsApi.getOne).toHaveBeenCalledWith('i1')
    expect(store.itemsByList['l1'][0].dueDate).toBe('2024-07-15T00:00:00Z')
    expect(completion).toEqual(fakeCompletion)
  })

  it('still returns completion when listId not in store', async () => {
    mockItemsApi.complete.mockResolvedValue(fakeCompletion)
    mockItemsApi.getOne.mockResolvedValue(fakeItem('i1'))
    const store = useItemsStore()
    const completion = await store.completeItem('l1', 'i1')
    expect(completion).toEqual(fakeCompletion)
  })
})

describe('archiveItem()', () => {
  it('removes the item from itemsByList', async () => {
    mockListsApi.getItems.mockResolvedValue([fakeItem('i1'), fakeItem('i2')])
    mockItemsApi.archive.mockResolvedValue(undefined)
    const store = useItemsStore()
    await store.fetchItems('l1')
    await store.archiveItem('l1', 'i1')
    expect(store.itemsByList['l1'].map((i) => i.id)).toEqual(['i2'])
  })

  it('does nothing when listId not in store', async () => {
    mockItemsApi.archive.mockResolvedValue(undefined)
    const store = useItemsStore()
    await expect(store.archiveItem('l1', 'i99')).resolves.toBeUndefined()
  })
})

describe('getItems()', () => {
  it('returns items for a loaded list', async () => {
    mockListsApi.getItems.mockResolvedValue([fakeItem('i1')])
    const store = useItemsStore()
    await store.fetchItems('l1')
    expect(store.getItems('l1')).toHaveLength(1)
  })

  it('returns empty array for an unknown listId', () => {
    const store = useItemsStore()
    expect(store.getItems('unknown')).toEqual([])
  })
})
