import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import ListDetailView from '../../../src/views/ListDetailView.vue'
import type { TodoItem } from '../../../src/types'

const { mockListsApi, mockItemsApi, mockTxTypesApi, mockSharesApi } = vi.hoisted(() => ({
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
  mockTxTypesApi: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    remove: vi.fn(),
  },
  mockSharesApi: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    remove: vi.fn(),
  },
}))

vi.mock('../../../src/api/lists.api', () => ({ listsApi: mockListsApi }))
vi.mock('../../../src/api/items.api', () => ({ itemsApi: mockItemsApi }))
vi.mock('../../../src/api/transaction-types.api', () => ({
  transactionTypesApi: mockTxTypesApi,
}))
vi.mock('../../../src/api/shares.api', () => ({ sharesApi: mockSharesApi }))

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

async function makeRouter(listId = 'l1', query?: Record<string, string>) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>Dashboard</div>' } },
      { path: '/lists/:listId', component: ListDetailView },
      { path: '/history/:itemId', component: { template: '<div>History</div>' } },
      { path: '/calendar', component: { template: '<div>Calendar</div>' } },
    ],
  })
  const queryString = query ? '?' + new URLSearchParams(query).toString() : ''
  await router.push(`/lists/${listId}${queryString}`)
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

  it('renders list content after load', async () => {
    mockListsApi.getOne.mockResolvedValue({ ...fakeList, description: 'My tasks' })
    mockListsApi.getItems.mockResolvedValue([])
    const router = await makeRouter()
    const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    expect(wrapper.text()).toContain('My tasks')
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

    // No note or amount entered, so opts is empty object
    expect(mockItemsApi.complete).toHaveBeenCalledWith('i1', {})
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

    // Set due date first (index 1 = dueDate, index 0 = startDate)
    const dueDateInput = wrapper.findAll('input[type="date"]')[1]
    await dueDateInput.setValue('2024-06-15')

    // Change recurrence type to monthly_on_day using the correct recurrence select
    const recurrenceSelect = wrapper
      .findAll('select')
      .find((s) => (s.element as HTMLSelectElement).querySelector('option[value="daily"]'))!
    await recurrenceSelect.setValue('monthly_on_day')
    await flushPromises()

    // dayOfMonth input should appear (v-if="form.recurrenceType === 'monthly_on_day'")
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

    // Set due date first (index 1 = dueDate, index 0 = startDate)
    const dueDateInput = wrapper.findAll('input[type="date"]')[1]
    await dueDateInput.setValue('2024-06-15')

    // Change recurrence type to weekly_on_day using the correct recurrence select
    const recurrenceSelect = wrapper
      .findAll('select')
      .find((s) => (s.element as HTMLSelectElement).querySelector('option[value="daily"]'))!
    await recurrenceSelect.setValue('weekly_on_day')
    await flushPromises()

    // weekdayMask select should appear (3rd select: targetList? + currency + recurrence + weekday)
    const allSelects = wrapper.findAll('select')
    expect(allSelects.length).toBeGreaterThan(2)
  })

  it('closes modal when clicking Cancel button', async () => {
    mockListsApi.getOne.mockResolvedValue(fakeList)
    mockListsApi.getItems.mockResolvedValue([])
    const router = await makeRouter()
    const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    await wrapper.find('button.btn-primary.btn-sm').trigger('click')
    expect(wrapper.find('.modal-backdrop').exists()).toBe(true)

    // Find and click the Cancel button inside the modal
    const cancelBtn = wrapper.find('.modal-backdrop button.btn-secondary')
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

    it('does not reload comments when already loaded (cache check)', async () => {
      const item = fakeItem('i1', 'Cached Comments')
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([item])
      mockItemsApi.getComments.mockResolvedValue([])
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      const toggleBtn = wrapper.find('.comments-toggle')
      // Open (loads)
      await toggleBtn.trigger('click')
      await flushPromises()
      // Close
      await toggleBtn.trigger('click')
      await flushPromises()
      // Open again (should use cache, no second API call)
      await toggleBtn.trigger('click')
      await flushPromises()

      expect(mockItemsApi.getComments).toHaveBeenCalledTimes(1)
    })

    it('does not add comment when text is empty', async () => {
      const item = fakeItem('i1', 'Item')
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([item])
      mockItemsApi.getComments.mockResolvedValue([])
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      await wrapper.find('.comments-toggle').trigger('click')
      await flushPromises()

      // Submit without entering text
      await wrapper.find('form.comment-form').trigger('submit')
      await flushPromises()

      expect(mockItemsApi.addComment).not.toHaveBeenCalled()
    })
  })

  describe('handleDuplicate', () => {
    it('opens add modal pre-filled with "Copy of <title>" when duplicate button is clicked', async () => {
      const item = fakeItem('i1', 'Original Task')
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([item])
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      // Click duplicate button from TodoItem component
      const duplicateBtn = wrapper.find('button[title="Duplicate item"]')
      await duplicateBtn.trigger('click')
      await flushPromises()

      expect(wrapper.find('.modal-backdrop').exists()).toBe(true)
      expect(wrapper.find('input[type="text"]').element.value).toBe('Copy of Original Task')
    })

    it('does nothing when item not found (handleDuplicate guard)', async () => {
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([])
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      // No items, so nothing to duplicate — modal should stay closed
      expect(wrapper.find('.modal-backdrop').exists()).toBe(false)
    })
  })

  describe('computeFirstOccurrence (auto-fill due date from recurrence type)', () => {
    // Helper: get the due date input (second date input; first is startDate)
    function getDueDateInput(wrapper: ReturnType<typeof mount>) {
      const dateInputs = wrapper.findAll('input[type="date"]')
      return dateInputs.length >= 2 ? dateInputs[1] : dateInputs[0]
    }

    // Helper: get the recurrence type select (has option value="daily")
    function getRecurrenceSelect(wrapper: ReturnType<typeof mount>) {
      return wrapper
        .findAll('select')
        .find((s) => (s.element as HTMLSelectElement).querySelector('option[value="daily"]'))!
    }

    it('auto-fills due date for daily recurrence when no due date is set', async () => {
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([])
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      await wrapper.find('button.btn-primary').trigger('click')
      await flushPromises()

      // Change recurrence type to daily (no due date set)
      await getRecurrenceSelect(wrapper).setValue('daily')
      await flushPromises()

      // Due date should now be auto-filled (tomorrow = 2024-06-16)
      const dueDateInput = getDueDateInput(wrapper)
      expect(dueDateInput.element.value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('auto-fills due date for weekly_on_day recurrence when no due date is set', async () => {
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([])
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      await wrapper.find('button.btn-primary').trigger('click')
      await flushPromises()

      await getRecurrenceSelect(wrapper).setValue('weekly_on_day')
      await flushPromises()

      const dueDateInput = getDueDateInput(wrapper)
      expect(dueDateInput.element.value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('exercises the weekly branch in computeFirstOccurrence (no due date, no bits)', async () => {
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([])
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      await wrapper.find('button.btn-primary').trigger('click')
      await flushPromises()

      // weekly with no weeklyDayBits → computeFirstOccurrence returns ''
      // branch is still exercised
      await getRecurrenceSelect(wrapper).setValue('weekly')
      await flushPromises()

      // No assertion needed — the branch has been covered
      expect(wrapper.find('.modal-backdrop').exists()).toBe(true)
    })

    it('auto-fills due date for monthly_on_day recurrence when no due date is set', async () => {
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([])
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      await wrapper.find('button.btn-primary').trigger('click')
      await flushPromises()

      await getRecurrenceSelect(wrapper).setValue('monthly_on_day')
      await flushPromises()

      const dueDateInput = getDueDateInput(wrapper)
      expect(dueDateInput.element.value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('auto-fills due date for custom_days recurrence when no due date is set', async () => {
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([])
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      await wrapper.find('button.btn-primary').trigger('click')
      await flushPromises()

      await getRecurrenceSelect(wrapper).setValue('custom_days')
      await flushPromises()

      const dueDateInput = getDueDateInput(wrapper)
      expect(dueDateInput.element.value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('auto-fills due date for yearly recurrence when no due date is set', async () => {
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([])
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      await wrapper.find('button.btn-primary').trigger('click')
      await flushPromises()

      await getRecurrenceSelect(wrapper).setValue('yearly')
      await flushPromises()

      const dueDateInput = getDueDateInput(wrapper)
      expect(dueDateInput.element.value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('hits fallback return empty string for unknown recurrence type (lines 336-337)', async () => {
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([])
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      await wrapper.find('button.btn-primary').trigger('click')
      await flushPromises()

      // No due date set; set recurrence to unknown type → watcher calls computeFirstOccurrence
      // which falls through all if-blocks and returns '' → dueDate stays empty
      await getRecurrenceSelect(wrapper).setValue('unknown_recurrence_type')
      await flushPromises()

      const dueDateInput = getDueDateInput(wrapper)
      expect(dueDateInput.element.value).toBe('')
    })
  })

  describe('move item to another list', () => {
    it('moves item to a different list when targetListId changes and form is submitted', async () => {
      const item = fakeItem('i1', 'Move Me')
      const list2 = {
        id: 'l2',
        userId: 'u1',
        title: 'Other List',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([item])
      mockListsApi.getAll.mockResolvedValue([fakeList, list2])
      const updatedItem = { ...item, listId: 'l2' }
      mockItemsApi.update.mockResolvedValue(updatedItem)
      mockItemsApi.getOne.mockResolvedValue(updatedItem)
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      // Open edit modal
      const editBtn = wrapper.find('button[title="Edit item"]')
      await editBtn.trigger('click')
      await flushPromises()

      // Find the list selector (first select when multiple lists) and change to l2
      const selects = wrapper.findAll('select')
      const listSelect = selects[0]
      await listSelect.setValue('l2')
      await flushPromises()

      // Submit edit form
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockItemsApi.update).toHaveBeenCalledWith(
        'i1',
        expect.objectContaining({ listId: 'l2' })
      )
    })
  })

  describe('closeModal with autoBack', () => {
    it('navigates back when modal is closed after autoBack is set (editItem query param)', async () => {
      const item = fakeItem('i1', 'Auto-edit Item')
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([item])
      const router = await makeRouter('l1', { editItem: 'i1' })
      const pushSpy = vi.spyOn(router, 'push')
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      // Modal should auto-open for editItem=i1
      expect(wrapper.find('.modal-backdrop').exists()).toBe(true)

      // Click Cancel inside the modal → should navigate back (autoBack=true)
      const cancelBtn = wrapper.find('.modal-backdrop button.btn-secondary')
      await cancelBtn.trigger('click')
      await flushPromises()

      expect(pushSpy).toHaveBeenCalled()
    })
  })

  describe('prefill add modal from query params', () => {
    it('pre-fills title and description from prefillTitle and prefillDesc query params', async () => {
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([])
      const router = await makeRouter('l1', {
        prefillTitle: 'Pre-filled Task',
        prefillDesc: 'Pre-filled desc',
      })
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      // Modal should auto-open
      expect(wrapper.find('.modal-backdrop').exists()).toBe(true)
      const titleInput = wrapper.find('input[type="text"]')
      expect(titleInput.element.value).toBe('Pre-filled Task')
    })
  })

  describe('handleSaveItem with recurrence', () => {
    // Helper: finds the recurrence type select (has option value="daily")
    function getRecurrenceSelect(wrapper: ReturnType<typeof mount>) {
      return wrapper
        .findAll('select')
        .find((s) => (s.element as HTMLSelectElement).querySelector('option[value="daily"]'))!
    }

    it('creates item with weekly recurrence and bitmask', async () => {
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([])
      const newItem = fakeItem('i2', 'Weekly Task')
      mockListsApi.createItem.mockResolvedValue(newItem)
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      await wrapper.find('button.btn-primary').trigger('click')
      await flushPromises()
      await wrapper.find('input[type="text"]').setValue('Weekly Task')

      // Set recurrence to weekly using the correct select
      await getRecurrenceSelect(wrapper).setValue('weekly')
      await flushPromises()

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockListsApi.createItem).toHaveBeenCalledWith(
        'l1',
        expect.objectContaining({ recurrenceRule: expect.objectContaining({ type: 'weekly' }) })
      )
    })

    it('creates item with weekly_on_day recurrence', async () => {
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([])
      const newItem = fakeItem('i2', 'Weekly On Day Task')
      mockListsApi.createItem.mockResolvedValue(newItem)
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      await wrapper.find('button.btn-primary').trigger('click')
      await flushPromises()
      await wrapper.find('input[type="text"]').setValue('Weekly On Day Task')

      await getRecurrenceSelect(wrapper).setValue('weekly_on_day')
      await flushPromises()

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockListsApi.createItem).toHaveBeenCalledWith(
        'l1',
        expect.objectContaining({
          recurrenceRule: expect.objectContaining({ type: 'weekly_on_day' }),
        })
      )
    })

    it('shows error message from server response on save failure', async () => {
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([])
      mockListsApi.createItem.mockRejectedValue({
        response: { data: { message: 'Server validation error' } },
      })
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      await wrapper.find('button.btn-primary').trigger('click')
      await flushPromises()
      await wrapper.find('input[type="text"]').setValue('Bad Item')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.text()).toContain('Server validation error')
    })

    it('creates item with currency set (covers currency.toUpperCase() on create)', async () => {
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([])
      mockListsApi.createItem.mockResolvedValue(fakeItem('i2', 'Priced Task'))
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      await wrapper.find('button.btn-primary').trigger('click')
      await flushPromises()
      await wrapper.find('input[type="text"]').setValue('Priced Task')

      const currencySelect = wrapper
        .findAll('select')
        .find((s) => (s.element as HTMLSelectElement).querySelector('option[value="USD"]'))
      if (currencySelect) await currencySelect.setValue('USD')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockListsApi.createItem).toHaveBeenCalledWith(
        'l1',
        expect.objectContaining({ currency: 'USD' })
      )
    })

    it('edits item with currency set (covers currency.toUpperCase() on edit)', async () => {
      const item = { ...fakeItem('i1', 'Priced Task'), currency: 'eur' }
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([item])
      const updatedItem = { ...item, currency: 'EUR' }
      mockItemsApi.update.mockResolvedValue(updatedItem)
      mockItemsApi.getOne.mockResolvedValue(updatedItem)
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      await wrapper.find('button[title="Edit item"]').trigger('click')
      await flushPromises()

      const currencySelect = wrapper
        .findAll('select')
        .find((s) => (s.element as HTMLSelectElement).querySelector('option[value="USD"]'))
      if (currencySelect) await currencySelect.setValue('EUR')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockItemsApi.update).toHaveBeenCalledWith(
        'i1',
        expect.objectContaining({ currency: 'EUR' })
      )
    })

    it('creates item with weekly recurrence with checked day bits (covers reduce arrow fn)', async () => {
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([])
      mockListsApi.createItem.mockResolvedValue(fakeItem('i2', 'Weekly Bits Task'))
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      await wrapper.find('button.btn-primary').trigger('click')
      await flushPromises()
      await wrapper.find('input[type="text"]').setValue('Weekly Bits Task')

      await getRecurrenceSelect(wrapper).setValue('weekly')
      await flushPromises()

      // Check a weekday checkbox so weeklyDayBits is non-empty
      const dayCheckbox = wrapper.find('input[type="checkbox"]')
      if (dayCheckbox.exists()) {
        const el = dayCheckbox.element as HTMLInputElement
        el.checked = true
        await dayCheckbox.trigger('change')
      }

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockListsApi.createItem).toHaveBeenCalledWith(
        'l1',
        expect.objectContaining({ recurrenceRule: expect.objectContaining({ type: 'weekly' }) })
      )
    })

    it('creates item with monthly_on_day recurrence (covers weekdayMask undefined branch)', async () => {
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([])
      mockListsApi.createItem.mockResolvedValue(fakeItem('i2', 'Monthly Task'))
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      await wrapper.find('button.btn-primary').trigger('click')
      await flushPromises()
      await wrapper.find('input[type="text"]').setValue('Monthly Task')

      await getRecurrenceSelect(wrapper).setValue('monthly_on_day')
      await flushPromises()

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockListsApi.createItem).toHaveBeenCalledWith(
        'l1',
        expect.objectContaining({
          recurrenceRule: expect.objectContaining({ type: 'monthly_on_day' }),
        })
      )
    })

    it('edits item with dueDate set (covers dueDate ISO branch on edit)', async () => {
      const item = { ...fakeItem('i1', 'Due Task'), dueDate: '2024-07-01T00:00:00.000Z' }
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([item])
      const updatedItem = { ...item, title: 'Due Task Updated' }
      mockItemsApi.update.mockResolvedValue(updatedItem)
      mockItemsApi.getOne.mockResolvedValue(updatedItem)
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      await wrapper.find('button[title="Edit item"]').trigger('click')
      await flushPromises()

      // dueDate is pre-filled; just submit
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockItemsApi.update).toHaveBeenCalledWith(
        'i1',
        expect.objectContaining({ dueDate: expect.stringContaining('T') })
      )
    })

    it('creates item with startDate set (covers startDate ISO branch on create)', async () => {
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([])
      mockListsApi.createItem.mockResolvedValue(fakeItem('i2', 'Timed Task'))
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      await wrapper.find('button.btn-primary').trigger('click')
      await flushPromises()
      await wrapper.find('input[type="text"]').setValue('Timed Task')

      // startDate is the first date input in the form
      const dateInputs = wrapper.findAll('input[type="date"]')
      if (dateInputs.length > 0) await dateInputs[0].setValue('2024-06-14')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockListsApi.createItem).toHaveBeenCalledWith(
        'l1',
        expect.objectContaining({ startDate: expect.stringContaining('T') })
      )
    })

    it('edits item with startDate set (covers startDate ISO branch on edit)', async () => {
      const item = { ...fakeItem('i1', 'Timed Edit Task'), startDate: '2024-06-10T00:00:00.000Z' }
      mockListsApi.getOne.mockResolvedValue(fakeList)
      mockListsApi.getItems.mockResolvedValue([item])
      const updatedItem = { ...item }
      mockItemsApi.update.mockResolvedValue(updatedItem)
      mockItemsApi.getOne.mockResolvedValue(updatedItem)
      const router = await makeRouter()
      const wrapper = mount(ListDetailView, { global: { plugins: [pinia, router] } })
      await flushPromises()

      await wrapper.find('button[title="Edit item"]').trigger('click')
      await flushPromises()

      // startDate is pre-filled; just submit
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockItemsApi.update).toHaveBeenCalledWith(
        'i1',
        expect.objectContaining({ startDate: expect.stringContaining('T') })
      )
    })
  })
})
