import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import AuditLogView from '../../../src/views/AuditLogView.vue'

const { mockAuthApi } = vi.hoisted(() => ({
  mockAuthApi: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    getAuditLog: vi.fn(),
  },
}))

vi.mock('../../../src/api/auth.api', () => ({ authApi: mockAuthApi }))

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/audit', component: AuditLogView },
      { path: '/:pathMatch(.*)*', redirect: '/audit' },
    ],
  })
}

function fakeEntry(
  overrides: Partial<{
    id: string
    action: string
    entityType: string
    summary: string | null
    createdAt: string
  }> = {}
) {
  return {
    id: overrides.id ?? 'e1',
    userId: 'u1',
    action: overrides.action ?? 'item.create',
    entityType: overrides.entityType ?? 'todo_item',
    entityId: 'x1',
    summary: 'summary' in overrides ? overrides.summary : 'Created item "Buy milk"',
    createdAt: overrides.createdAt ?? '2024-06-15T10:00:00Z',
  }
}

let pinia: ReturnType<typeof createPinia>
let currentWrapper: ReturnType<typeof mount> | null = null

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  vi.clearAllMocks()
})

afterEach(() => {
  currentWrapper?.unmount()
  currentWrapper = null
})

function mountAuditLog() {
  const router = makeRouter()
  const wrapper = mount(AuditLogView, {
    global: { plugins: [pinia, router] },
  })
  currentWrapper = wrapper
  return { wrapper, router }
}

describe('AuditLogView', () => {
  it('shows loading state while fetching', async () => {
    mockAuthApi.getAuditLog.mockReturnValue(new Promise(() => {}))
    const { wrapper } = mountAuditLog()
    // Loading state is shown before promises settle
    expect(wrapper.text()).toContain('Loading')
  })

  it('shows empty state when no entries', async () => {
    mockAuthApi.getAuditLog.mockResolvedValue([])
    const { wrapper } = mountAuditLog()
    await flushPromises()
    expect(wrapper.text()).toContain('No activity recorded yet')
  })

  it('renders table with entries', async () => {
    mockAuthApi.getAuditLog.mockResolvedValue([
      fakeEntry({ id: 'e1', action: 'item.create', summary: 'Created item "Buy milk"' }),
      fakeEntry({ id: 'e2', action: 'list.delete', summary: null }),
    ])
    const { wrapper } = mountAuditLog()
    await flushPromises()

    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.text()).toContain('item.create')
    expect(wrapper.text()).toContain('list.delete')
    expect(wrapper.text()).toContain('Created item "Buy milk"')
  })

  it('renders em dash for entries with null summary', async () => {
    mockAuthApi.getAuditLog.mockResolvedValue([fakeEntry({ id: 'e1', summary: null })])
    const { wrapper } = mountAuditLog()
    await flushPromises()

    expect(wrapper.text()).toContain('—')
  })

  it('formats the timestamp', async () => {
    mockAuthApi.getAuditLog.mockResolvedValue([fakeEntry({ createdAt: '2024-06-15T10:00:00Z' })])
    const { wrapper } = mountAuditLog()
    await flushPromises()

    // Formatted as 'dd MMM yyyy HH:mm' = '15 Jun 2024 10:00'
    expect(wrapper.text()).toContain('Jun 2024')
  })

  it('hides Load More when fewer than 100 entries are returned', async () => {
    mockAuthApi.getAuditLog.mockResolvedValue(
      Array.from({ length: 50 }, (_, i) => fakeEntry({ id: `e${i}` }))
    )
    const { wrapper } = mountAuditLog()
    await flushPromises()

    expect(wrapper.find('button.btn-secondary').exists()).toBe(false)
  })

  it('shows Load More when exactly 100 entries are returned', async () => {
    mockAuthApi.getAuditLog.mockResolvedValue(
      Array.from({ length: 100 }, (_, i) => fakeEntry({ id: `e${i}` }))
    )
    const { wrapper } = mountAuditLog()
    await flushPromises()

    expect(wrapper.find('button.btn-secondary').exists()).toBe(true)
    expect(wrapper.find('button.btn-secondary').text()).toContain('Load more')
  })

  it('loads more entries when Load More is clicked', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => fakeEntry({ id: `p1e${i}` }))
    const page2 = Array.from({ length: 30 }, (_, i) => fakeEntry({ id: `p2e${i}` }))

    mockAuthApi.getAuditLog.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2)

    const { wrapper } = mountAuditLog()
    await flushPromises()

    await wrapper.find('button.btn-secondary').trigger('click')
    await flushPromises()

    expect(mockAuthApi.getAuditLog).toHaveBeenCalledTimes(2)
    expect(mockAuthApi.getAuditLog).toHaveBeenNthCalledWith(2, { limit: 100, offset: 100 })

    // Load More should be gone after 30 entries (< 100)
    expect(wrapper.find('button.btn-secondary').exists()).toBe(false)
  })

  it('shows loading text in Load More button while fetching', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => fakeEntry({ id: `le${i}` }))
    let resolve!: (v: unknown) => void
    mockAuthApi.getAuditLog
      .mockResolvedValueOnce(page1)
      .mockReturnValueOnce(new Promise((r) => (resolve = r)))

    const { wrapper } = mountAuditLog()
    await flushPromises()

    await wrapper.find('button.btn-secondary').trigger('click')
    await flushPromises()

    expect(wrapper.find('button.btn-secondary').text()).toContain('Loading')
    resolve([])
    await flushPromises()
  })

  it('displays the entity type column', async () => {
    mockAuthApi.getAuditLog.mockResolvedValue([fakeEntry({ entityType: 'todo_item' })])
    const { wrapper } = mountAuditLog()
    await flushPromises()

    expect(wrapper.text()).toContain('todo_item')
  })
})
