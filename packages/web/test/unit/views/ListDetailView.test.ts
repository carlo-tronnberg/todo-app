import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import ListDetailView from '../../../src/views/ListDetailView.vue'
import type { TodoItem } from '../../../src/types'

const { mockListsApi, mockItemsApi } = vi.hoisted(() => ({
  mockListsApi: {
    getAll: vi.fn(),
    getOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getItems: vi.fn(),
    createItem: vi.fn(),
  },
  mockItemsApi: {
    getOne: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    complete: vi.fn(),
    getCompletions: vi.fn(),
    deleteCompletion: vi.fn(),
    duplicate: vi.fn(),
    getComments: vi.fn(),
    addComment: vi.fn(),
    deleteComment: vi.fn(),
  },
}))

vi.mock('../../../src/api/lists.api', () => ({ listsApi: mockListsApi }))
vi.mock('../../../src/api/items.api', () => ({ itemsApi: mockItemsApi }))

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

const fakeList = {
  id: 'l1',
  userId: 'u1',
  title: 'Test List',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
}

async function makeRouter(listId = 'l1') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>Dashboard</div>' } },
      { path: '/lists/:listId', component: ListDetailView },
      { path: '/history/:itemId', component: { template: '<div>History</div>' } },
    ],
  })
  await router.push(`/lists/${listId}`)
  return router
}

let pinia: ReturnType<typeof createPinia>

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  vi.clearAllMocks()
  mockListsApi.getAll.mockResolvedValue([])
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ListDetailView', () => {
  it('shows loading state while fetching', async () => {
    mockListsApi.getOne.mockResolvedValue(fakeList)
    mockListsApi.getItems.mockReturnValue(new Promise(() => {}))
    const router = await makeRouter()
    const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
    // Flush getOne so fetchItems is called and loading=true; getItems hangs
    await flushPromises()
    expect(wrapper.text()).toContain('Loading')
  })

  it('shows empty state when no items', async () => {
    mockListsApi.getOne.mockResolvedValue(fakeList)
    mockListsApi.getItems.mockResolvedValue([])
    const router = await makeRouter()
    const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    expect(wrapper.text()).toContain('No items yet')
  })

  it('renders item titles', async () => {
    mockListsApi.getOne.mockResolvedValue(fakeList)
    mockListsApi.getItems.mockResolvedValue([
      fakeItem('i1', 'Buy milk'),
      fakeItem('i2', 'Read book'),
    ])
    const router = await makeRouter()
    const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    expect(wrapper.text()).toContain('Buy milk')
    expect(wrapper.text()).toContain('Read book')
  })

  it('shows list title after load', async () => {
    mockListsApi.getOne.mockResolvedValue(fakeList)
    mockListsApi.getItems.mockResolvedValue([])
    const router = await makeRouter()
    const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    expect(wrapper.text()).toContain('Test List')
  })

  it('opens add item modal when Add Item button is clicked', async () => {
    mockListsApi.getOne.mockResolvedValue(fakeList)
    mockListsApi.getItems.mockResolvedValue([])
    const router = await makeRouter()
    const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    await wrapper.find('button.btn-primary').trigger('click')
    expect(wrapper.text()).toContain('New Item')
  })

  it('opens complete modal when complete button is clicked', async () => {
    const item = fakeItem('i1', 'My Task')
    mockListsApi.getOne.mockResolvedValue(fakeList)
    mockListsApi.getItems.mockResolvedValue([item])
    const router = await makeRouter()
    const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    const completeBtn = wrapper.find('.complete-btn')
    await completeBtn.trigger('click')
    expect(wrapper.text()).toContain('Complete Item')
  })

  it('calls completeItem when complete modal is confirmed', async () => {
    const item = fakeItem('i1', 'My Task')
    mockListsApi.getOne.mockResolvedValue(fakeList)
    mockListsApi.getItems.mockResolvedValue([item])
    mockItemsApi.complete.mockResolvedValue({ id: 'c1', itemId: 'i1', completedAt: '2024-06-15' })
    mockItemsApi.getOne.mockResolvedValue({ ...item, dueDate: '2024-07-15T00:00:00Z' })
    const router = await makeRouter()
    const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    await wrapper.find('.complete-btn').trigger('click')
    // Find the "Complete" button in the modal (btn-primary that is NOT type submit)
    const modalBtns = wrapper.findAll('.btn-primary')
    const completeConfirmBtn = modalBtns.find((b) => b.text() === 'Complete')!
    await completeConfirmBtn.trigger('click')
    await flushPromises()

    // completionNote is '' which is falsy, so || undefined makes it undefined
    expect(mockItemsApi.complete).toHaveBeenCalledWith('i1', undefined)
  })

  it('opens edit modal when edit button is clicked', async () => {
    const item = fakeItem('i1', 'Edit Me')
    mockListsApi.getOne.mockResolvedValue(fakeList)
    mockListsApi.getItems.mockResolvedValue([item])
    const router = await makeRouter()
    const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    const editBtn = wrapper.find('button[title="Edit item"]')
    await editBtn.trigger('click')
    expect(wrapper.text()).toContain('Edit Item')
  })

  it('calls archiveItem when archive button is clicked', async () => {
    const item = fakeItem('i1', 'Archive Me')
    mockListsApi.getOne.mockResolvedValue(fakeList)
    mockListsApi.getItems.mockResolvedValue([item])
    mockItemsApi.archive.mockResolvedValue(undefined)
    // handleArchive calls window.confirm() — mock it to return true
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const router = await makeRouter()
    const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    const archiveBtn = wrapper.find('.icon-btn-danger')
    await archiveBtn.trigger('click')
    await flushPromises()

    expect(mockItemsApi.archive).toHaveBeenCalledWith('i1')
  })

  it('creates a new item when add form is submitted', async () => {
    mockListsApi.getOne.mockResolvedValue(fakeList)
    mockListsApi.getItems.mockResolvedValue([])
    const newItem = fakeItem('i2', 'New Task')
    mockListsApi.createItem.mockResolvedValue(newItem)
    const router = await makeRouter()
    const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    await wrapper.find('button.btn-primary').trigger('click')
    await wrapper.find('input[type="text"]').setValue('New Task')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockListsApi.createItem).toHaveBeenCalledWith(
      'l1',
      expect.objectContaining({ title: 'New Task' })
    )
  })

  it('updates an item when edit form is submitted', async () => {
    const item = fakeItem('i1', 'Edit Me')
    mockListsApi.getOne.mockResolvedValue(fakeList)
    mockListsApi.getItems.mockResolvedValue([item])
    const updatedItem = { ...item, title: 'Updated Title' }
    mockItemsApi.update.mockResolvedValue(updatedItem)
    mockItemsApi.getOne.mockResolvedValue(updatedItem)
    const router = await makeRouter()
    const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    // Click edit
    const editBtn = wrapper.find('button[title="Edit item"]')
    await editBtn.trigger('click')

    // Change title and submit
    const titleInput = wrapper.find('input[type="text"]')
    await titleInput.setValue('Updated Title')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockItemsApi.update).toHaveBeenCalledWith(
      'i1',
      expect.objectContaining({ title: 'Updated Title' })
    )
  })

  it('shows save error when item creation fails', async () => {
    mockListsApi.getOne.mockResolvedValue(fakeList)
    mockListsApi.getItems.mockResolvedValue([])
    mockListsApi.createItem.mockRejectedValue({ message: 'Bad request' })
    const router = await makeRouter()
    const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    await wrapper.find('button.btn-primary').trigger('click')
    await wrapper.find('input[type="text"]').setValue('Failing Task')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Bad request')
  })

  it('auto-sets dayOfMonth when recurrenceType changes to monthly_on_day', async () => {
    mockListsApi.getOne.mockResolvedValue(fakeList)
    mockListsApi.getItems.mockResolvedValue([])
    const router = await makeRouter()
    const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    await wrapper.find('button.btn-primary').trigger('click')

    // Set due date first
    const dueDateInput = wrapper.find('input[type="date"]')
    await dueDateInput.setValue('2024-06-15')

    // Change recurrence type to monthly_on_day
    const recurrenceSelect = wrapper.find('select')
    await recurrenceSelect.setValue('monthly_on_day')
    await flushPromises()

    // dayOfMonth input should appear
    const dayInput = wrapper.find('input[type="number"]')
    expect(dayInput.exists()).toBe(true)
  })

  it('auto-sets weekdayMask when recurrenceType changes to weekly_on_day', async () => {
    mockListsApi.getOne.mockResolvedValue(fakeList)
    mockListsApi.getItems.mockResolvedValue([])
    const router = await makeRouter()
    const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    await wrapper.find('button.btn-primary').trigger('click')

    // Set due date first
    const dueDateInput = wrapper.find('input[type="date"]')
    await dueDateInput.setValue('2024-06-15')

    // Change recurrence type to weekly_on_day
    const recurrenceSelect = wrapper.find('select')
    await recurrenceSelect.setValue('weekly_on_day')
    await flushPromises()

    // weekdayMask select should appear (a second select for the weekday)
    const allSelects = wrapper.findAll('select')
    expect(allSelects.length).toBeGreaterThan(1)
  })

  it('closes modal when clicking Cancel button', async () => {
    mockListsApi.getOne.mockResolvedValue(fakeList)
    mockListsApi.getItems.mockResolvedValue([])
    const router = await makeRouter()
    const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    await wrapper.find('button.btn-primary').trigger('click')
    expect(wrapper.find('.modal-backdrop').exists()).toBe(true)

    // Find and click the Cancel button in the modal
    const cancelBtn = wrapper.find('button.btn-secondary')
    await cancelBtn.trigger('click')
    await flushPromises()

    expect(wrapper.find('.modal-backdrop').exists()).toBe(false)
  })

  it('does not archive when confirm is declined', async () => {
    const item = fakeItem('i1', 'Keep Me')
    mockListsApi.getOne.mockResolvedValue(fakeList)
    mockListsApi.getItems.mockResolvedValue([item])
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const router = await makeRouter()
    const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    const archiveBtn = wrapper.find('.icon-btn-danger')
    await archiveBtn.trigger('click')
    await flushPromises()

    expect(mockItemsApi.archive).not.toHaveBeenCalled()
  })

  describe('comments', () => {
    it('toggles comments open and loads them via API', async () => {
      const item = fakeItem('i1', 'Item with Comments')
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([item])
      const fakeComments = [
        {
          id: 'c1',
          itemId: 'i1',
          userId: 'u1',
          content: 'Hello',
          createdAt: '2024-06-15T10:00:00Z',
          updatedAt: '2024-06-15T10:00:00Z',
        },
      ]
      mockItemsApi.getComments.mockResolvedValue(fakeComments)
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      const toggleBtn = wrapper.find('.comments-toggle')
      await toggleBtn.trigger('click')
      await flushPromises()

      expect(mockItemsApi.getComments).toHaveBeenCalledWith('i1')
      expect(wrapper.text()).toContain('Hello')
    })

    it('hides comments when toggled closed', async () => {
      const item = fakeItem('i1', 'Item')
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([item])
      mockItemsApi.getComments.mockResolvedValue([])
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      const toggleBtn = wrapper.find('.comments-toggle')
      // Open
      await toggleBtn.trigger('click')
      await flushPromises()
      expect(wrapper.find('.comments-section').exists()).toBe(true)

      // Close
      await toggleBtn.trigger('click')
      await flushPromises()
      expect(wrapper.find('.comments-section').exists()).toBe(false)
    })

    it('adds a comment', async () => {
      const item = fakeItem('i1', 'Commentable Item')
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([item])
      mockItemsApi.getComments.mockResolvedValue([])
      const newComment = {
        id: 'c2',
        itemId: 'i1',
        userId: 'u1',
        content: 'New comment',
        createdAt: '2024-06-15T10:00:00Z',
        updatedAt: '2024-06-15T10:00:00Z',
      }
      mockItemsApi.addComment.mockResolvedValue(newComment)
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      // Open comments
      await wrapper.find('.comments-toggle').trigger('click')
      await flushPromises()

      // Fill in comment text (input type="text" with class comment-input)
      const input = wrapper.find('input.comment-input')
      await input.setValue('New comment')

      // Submit form
      await wrapper.find('form.comment-form').trigger('submit')
      await flushPromises()

      expect(mockItemsApi.addComment).toHaveBeenCalledWith('i1', 'New comment')
    })

    it('deletes a comment', async () => {
      const item = fakeItem('i1', 'Has Comments')
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([item])
      const existingComment = {
        id: 'c1',
        itemId: 'i1',
        userId: 'u1',
        content: 'Old comment',
        createdAt: '2024-06-15T10:00:00Z',
        updatedAt: '2024-06-15T10:00:00Z',
      }
      mockItemsApi.getComments.mockResolvedValue([existingComment])
      mockItemsApi.deleteComment.mockResolvedValue(undefined)
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      // Open comments
      await wrapper.find('.comments-toggle').trigger('click')
      await flushPromises()

      // Click delete
      await wrapper.find('button.comment-delete').trigger('click')
      await flushPromises()

      expect(mockItemsApi.deleteComment).toHaveBeenCalledWith('c1')
    })
  })
})
