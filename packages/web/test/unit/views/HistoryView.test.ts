import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import HistoryView from '../../../src/views/HistoryView.vue'

const { mockItemsApi } = vi.hoisted(() => ({
  mockItemsApi: {
    getOne: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    complete: vi.fn(),
    getCompletions: vi.fn(),
    deleteCompletion: vi.fn(),
  },
}))

vi.mock('../../../src/api/items.api', () => ({ itemsApi: mockItemsApi }))

const fakeCompletion = {
  id: 'c1',
  itemId: 'i1',
  completedAt: '2024-06-15T10:00:00Z',
  dueDateSnapshot: '2024-06-15T00:00:00Z',
  note: null,
}

async function makeRouter(itemId = 'i1', listId?: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>Dashboard</div>' } },
      { path: '/lists/:listId', component: { template: '<div>List</div>' } },
      {
        path: '/history/:itemId',
        name: 'ItemHistory',
        component: HistoryView,
      },
    ],
  })
  const query = listId ? `?listId=${listId}` : ''
  await router.push(`/history/${itemId}${query}`)
  return router
}

let pinia: ReturnType<typeof createPinia>

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  vi.clearAllMocks()
})

describe('HistoryView', () => {
  it('shows loading initially then loads completions', async () => {
    mockItemsApi.getCompletions.mockResolvedValue([fakeCompletion])
    const router = await makeRouter()
    const wrapper = mount(HistoryView, { global: { plugins: [pinia, router] } })
    // Initially loading
    expect(wrapper.text()).toContain('Loading')
    await flushPromises()
    // After load
    expect(wrapper.find('.loading').exists()).toBe(false)
  })

  it('shows empty state when no completions', async () => {
    mockItemsApi.getCompletions.mockResolvedValue([])
    const router = await makeRouter()
    const wrapper = mount(HistoryView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    expect(wrapper.text()).toContain('No completions recorded yet')
  })

  it('renders completion entries', async () => {
    mockItemsApi.getCompletions.mockResolvedValue([fakeCompletion])
    const router = await makeRouter()
    const wrapper = mount(HistoryView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    expect(wrapper.text()).toContain('Completed:')
    expect(wrapper.text()).toContain('Was due:')
  })

  it('renders note when present', async () => {
    mockItemsApi.getCompletions.mockResolvedValue([{ ...fakeCompletion, note: 'Done early!' }])
    const router = await makeRouter()
    const wrapper = mount(HistoryView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    expect(wrapper.text()).toContain('Done early!')
  })

  it('opens undo modal when Undo button is clicked', async () => {
    mockItemsApi.getCompletions.mockResolvedValue([fakeCompletion])
    const router = await makeRouter()
    const wrapper = mount(HistoryView, {
      global: { plugins: [pinia, router] },
      attachTo: document.body,
    })
    await flushPromises()
    await wrapper.find('button.btn-sm').trigger('click')
    await flushPromises()
    // Modal is teleported to body
    expect(document.body.textContent).toContain('Undo completion?')
    wrapper.unmount()
  })

  it('closes undo modal when Cancel is clicked', async () => {
    mockItemsApi.getCompletions.mockResolvedValue([fakeCompletion])
    const router = await makeRouter()
    const wrapper = mount(HistoryView, {
      global: { plugins: [pinia, router] },
      attachTo: document.body,
    })
    await flushPromises()
    await wrapper.find('button.btn-sm').trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Undo completion?')
    // Click Cancel in the modal — use .modal-actions to avoid matching the Undo button in the list
    const cancelBtn = document.body.querySelector(
      '.modal-actions button.btn-secondary'
    ) as HTMLElement
    cancelBtn.click()
    await flushPromises()
    expect(document.body.textContent).not.toContain('Undo completion?')
    wrapper.unmount()
  })

  it('confirms undo and removes completion from list', async () => {
    mockItemsApi.getCompletions.mockResolvedValue([fakeCompletion])
    mockItemsApi.deleteCompletion.mockResolvedValue(undefined)
    const router = await makeRouter()
    const wrapper = mount(HistoryView, {
      global: { plugins: [pinia, router] },
      attachTo: document.body,
    })
    await flushPromises()

    await wrapper.find('button.btn-sm').trigger('click')
    await flushPromises()
    // Confirm delete via modal — use .modal-overlay to be unambiguous
    const confirmBtn = document.body.querySelector(
      '.modal-overlay button.btn-danger'
    ) as HTMLElement
    confirmBtn.click()
    await flushPromises()
    await flushPromises() // extra tick for Vue to patch DOM after async confirmUndo resolves

    expect(mockItemsApi.deleteCompletion).toHaveBeenCalledWith('c1')
    // Completion removed from list → empty state visible in body
    expect(document.body.textContent).toContain('No completions recorded yet')
    wrapper.unmount()
  })

  it('sorts completions most-recent first', async () => {
    const older = { ...fakeCompletion, id: 'c1', completedAt: '2024-06-10T10:00:00Z' }
    const newer = { ...fakeCompletion, id: 'c2', completedAt: '2024-06-15T10:00:00Z' }
    mockItemsApi.getCompletions.mockResolvedValue([older, newer])
    const router = await makeRouter()
    const wrapper = mount(HistoryView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    const entries = wrapper.findAll('.history-entry')
    expect(entries).toHaveLength(2)
    // Newer completion should appear first (15 Jun before 10 Jun)
    expect(entries[0].text()).toContain('15 Jun 2024')
  })

  it('back link points to list when listId query param is present', async () => {
    mockItemsApi.getCompletions.mockResolvedValue([])
    const router = await makeRouter('i1', 'l1')
    const wrapper = mount(HistoryView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    const backLink = wrapper.find('.back-link')
    expect(backLink.attributes('href')).toContain('/lists/l1')
  })

  it('back link points to / when no listId', async () => {
    mockItemsApi.getCompletions.mockResolvedValue([])
    const router = await makeRouter('i1')
    const wrapper = mount(HistoryView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    const backLink = wrapper.find('.back-link')
    expect(backLink.attributes('href')).toBe('/')
  })

  it('shows completion without dueDateSnapshot (no "Was due:" line)', async () => {
    const completionNoDate = {
      id: 'c2',
      itemId: 'i1',
      completedAt: '2024-06-20T10:00:00Z',
      dueDateSnapshot: null,
      note: null,
    }
    mockItemsApi.getCompletions.mockResolvedValue([completionNoDate])
    const router = await makeRouter()
    const wrapper = mount(HistoryView, {
      global: { plugins: [pinia, router] },
      attachTo: document.body,
    })
    await flushPromises()
    // Should render without "Was due:" line
    expect(wrapper.text()).not.toContain('Was due:')
    wrapper.unmount()
  })

  it('creates new item from completion when "New item from this" is clicked', async () => {
    const fakeItem = {
      id: 'i1',
      listId: 'l1',
      title: 'Buy Milk',
      description: 'Organic',
      isArchived: false,
      sortOrder: 0,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }
    mockItemsApi.getCompletions.mockResolvedValue([fakeCompletion])
    mockItemsApi.getOne.mockResolvedValue(fakeItem)
    const router = await makeRouter('i1', 'l1')
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mount(HistoryView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    // The "New item from this" button is present when listId is provided
    const newItemBtn = wrapper.find('button.btn-sm[title]')
    await newItemBtn.trigger('click')
    await flushPromises()

    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/lists/l1',
        query: expect.objectContaining({ prefillTitle: 'Buy Milk', prefillDesc: 'Organic' }),
      })
    )
  })

  it('creates new item from completion without description', async () => {
    const fakeItemNoDesc = {
      id: 'i1',
      listId: 'l1',
      title: 'Simple Task',
      description: null,
      isArchived: false,
      sortOrder: 0,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }
    mockItemsApi.getCompletions.mockResolvedValue([fakeCompletion])
    mockItemsApi.getOne.mockResolvedValue(fakeItemNoDesc)
    const router = await makeRouter('i1', 'l1')
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mount(HistoryView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    const newItemBtn = wrapper.find('button.btn-sm[title]')
    await newItemBtn.trigger('click')
    await flushPromises()

    // No prefillDesc key when description is null
    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/lists/l1',
        query: { prefillTitle: 'Simple Task' },
      })
    )
  })

  it('opens undo modal for completion without dueDateSnapshot', async () => {
    const completionNoDate = {
      id: 'c3',
      itemId: 'i1',
      completedAt: '2024-06-20T10:00:00Z',
      dueDateSnapshot: null,
      note: null,
    }
    mockItemsApi.getCompletions.mockResolvedValue([completionNoDate])
    const router = await makeRouter()
    const wrapper = mount(HistoryView, {
      global: { plugins: [pinia, router] },
      attachTo: document.body,
    })
    await flushPromises()

    // Click undo button
    await wrapper.find('.btn-sm').trigger('click')
    await flushPromises()
    // Modal should show
    expect(document.body.textContent).toContain('Undo completion?')
    // The dueDateSnapshot hint should NOT appear since there is no dueDateSnapshot
    expect(document.body.textContent).not.toContain('due date will be reverted')
    wrapper.unmount()
  })
})
