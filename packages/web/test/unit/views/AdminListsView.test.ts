import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AdminListsView from '../../../src/views/AdminListsView.vue'

const { mockAdminApi } = vi.hoisted(() => ({
  mockAdminApi: {
    getLists: vi.fn(),
  },
}))

vi.mock('../../../src/api/admin.api', () => ({ adminApi: mockAdminApi }))

const owner = {
  id: 'u1',
  email: 'alice@example.com',
  username: 'alice',
  firstName: 'Alice',
  lastName: 'Smith',
  avatarUrl: null,
}

const sharedUser = {
  id: 'u2',
  email: 'bob@example.com',
  username: 'bob',
  firstName: 'Bob',
  lastName: null,
  avatarUrl: null,
}

describe('AdminListsView', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  it('shows loading state', () => {
    mockAdminApi.getLists.mockReturnValue(new Promise(() => {}))
    const wrapper = mount(AdminListsView, { global: { plugins: [pinia] } })
    expect(wrapper.text()).toContain('Loading')
  })

  it('shows error on failure', async () => {
    mockAdminApi.getLists.mockRejectedValue(new Error('403'))
    const wrapper = mount(AdminListsView, { global: { plugins: [pinia] } })
    await flushPromises()
    expect(wrapper.text()).toContain('Access denied')
  })

  it('renders lists with title, owner, and item count', async () => {
    mockAdminApi.getLists.mockResolvedValue([
      {
        id: 'l1',
        title: 'Groceries',
        icon: '🛒',
        description: null,
        createdAt: '2026-01-01T00:00:00Z',
        owner,
        shares: [],
        itemCount: 5,
      },
    ])
    const wrapper = mount(AdminListsView, { global: { plugins: [pinia] } })
    await flushPromises()
    expect(wrapper.text()).toContain('Groceries')
    expect(wrapper.text()).toContain('🛒')
    expect(wrapper.text()).toContain('Alice Smith')
    expect(wrapper.text()).toContain('5')
  })

  it('shows — when no shares', async () => {
    mockAdminApi.getLists.mockResolvedValue([
      {
        id: 'l1',
        title: 'Solo List',
        icon: null,
        description: null,
        createdAt: '2026-01-01T00:00:00Z',
        owner,
        shares: [],
        itemCount: 0,
      },
    ])
    const wrapper = mount(AdminListsView, { global: { plugins: [pinia] } })
    await flushPromises()
    expect(wrapper.text()).toContain('—')
  })

  it('renders shared users with role badges', async () => {
    mockAdminApi.getLists.mockResolvedValue([
      {
        id: 'l1',
        title: 'Team List',
        icon: null,
        description: null,
        createdAt: '2026-01-01T00:00:00Z',
        owner,
        shares: [{ role: 'editor', user: sharedUser }],
        itemCount: 2,
      },
    ])
    const wrapper = mount(AdminListsView, { global: { plugins: [pinia] } })
    await flushPromises()
    expect(wrapper.text()).toContain('Bob')
    expect(wrapper.text()).toContain('editor')
  })

  it('shows avatar initials fallback for owner without firstName', async () => {
    mockAdminApi.getLists.mockResolvedValue([
      {
        id: 'l1',
        title: 'My List',
        icon: null,
        description: null,
        createdAt: '2026-01-01T00:00:00Z',
        owner: { ...owner, firstName: null, lastName: null },
        shares: [],
        itemCount: 0,
      },
    ])
    const wrapper = mount(AdminListsView, { global: { plugins: [pinia] } })
    await flushPromises()
    // Falls back to email display and username initial
    expect(wrapper.text()).toContain('alice@example.com')
    expect(wrapper.find('.user-avatar-fallback').text()).toBe('A')
  })
})
