import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AdminListsView from '../../../src/views/AdminListsView.vue'

const { mockAdminApi, mockSharesApi } = vi.hoisted(() => ({
  mockAdminApi: {
    getLists: vi.fn(),
  },
  mockSharesApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    updateRole: vi.fn(),
    remove: vi.fn(),
  },
}))

vi.mock('../../../src/api/admin.api', () => ({ adminApi: mockAdminApi }))
vi.mock('../../../src/api/shares.api', () => ({ sharesApi: mockSharesApi }))

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

  // ── Admin share management (lock/unlock flow) ────────────────────────────
  describe('lock toggle and ShareManageModal wiring', () => {
    function listWithShare(
      opts: { shares?: Array<{ id?: string; role: string; user: typeof sharedUser }> } = {}
    ) {
      return {
        id: 'l1',
        title: 'Alice Tasks',
        icon: null,
        description: null,
        createdAt: '2026-01-01T00:00:00Z',
        owner,
        shares: (opts.shares ?? []).map((s, i) => ({
          id: s.id ?? `s${i}`,
          role: s.role,
          user: s.user,
        })),
        itemCount: 3,
      }
    }

    let currentWrapper: ReturnType<typeof mount> | null = null

    beforeEach(() => {
      currentWrapper = null
    })

    function mountWith(lists: ReturnType<typeof listWithShare>[]) {
      mockAdminApi.getLists.mockResolvedValue(lists)
      const wrapper = mount(AdminListsView, {
        global: { plugins: [pinia] },
        attachTo: document.body,
      })
      currentWrapper = wrapper
      return wrapper
    }

    // Cleanup after each test in this block
    function cleanup() {
      currentWrapper?.unmount()
      currentWrapper = null
    }

    it('renders a lock button on each row by default', async () => {
      const wrapper = mountWith([listWithShare()])
      await flushPromises()
      expect(wrapper.find('.lock-toggle').exists()).toBe(true)
      expect(wrapper.find('.lock-toggle').attributes('title')).toBe('Unlock to manage shares')
      cleanup()
    })

    it('does not show Manage shares button when row is locked', async () => {
      const wrapper = mountWith([listWithShare()])
      await flushPromises()
      expect(wrapper.find('.manage-shares-btn').exists()).toBe(false)
      cleanup()
    })

    it('clicking the lock opens a confirmation dialog mentioning the owner', async () => {
      const wrapper = mountWith([listWithShare()])
      await flushPromises()
      await wrapper.find('.lock-toggle').trigger('click')
      await flushPromises()
      expect(wrapper.find('.modal').exists()).toBe(true)
      expect(wrapper.text()).toContain('Alice')
      cleanup()
    })

    it('Cancel keeps the row locked', async () => {
      const wrapper = mountWith([listWithShare()])
      await flushPromises()
      await wrapper.find('.lock-toggle').trigger('click')
      await flushPromises()
      await wrapper.find('.modal-actions .btn-secondary').trigger('click')
      await flushPromises()
      expect(wrapper.find('.manage-shares-btn').exists()).toBe(false)
      expect(wrapper.find('.lock-toggle').attributes('title')).toBe('Unlock to manage shares')
      cleanup()
    })

    it('Continue unlocks the row and reveals Manage shares', async () => {
      const wrapper = mountWith([listWithShare()])
      await flushPromises()
      await wrapper.find('.lock-toggle').trigger('click')
      await flushPromises()
      await wrapper.find('.modal-actions .btn-primary').trigger('click')
      await flushPromises()
      expect(wrapper.find('.manage-shares-btn').exists()).toBe(true)
      expect(wrapper.find('.lock-toggle').attributes('title')).toBe(
        'Lock — return row to read-only'
      )
      cleanup()
    })

    it('clicking the unlocked icon re-locks the row without confirmation', async () => {
      const wrapper = mountWith([listWithShare()])
      await flushPromises()
      // Unlock first
      await wrapper.find('.lock-toggle').trigger('click')
      await flushPromises()
      await wrapper.find('.modal-actions .btn-primary').trigger('click')
      await flushPromises()
      expect(wrapper.find('.manage-shares-btn').exists()).toBe(true)
      // Re-lock
      await wrapper.find('.lock-toggle').trigger('click')
      await flushPromises()
      expect(wrapper.find('.manage-shares-btn').exists()).toBe(false)
      cleanup()
    })

    it('opens the share manage modal and adds a share via the admin API', async () => {
      const wrapper = mountWith([listWithShare()])
      await flushPromises()
      // Unlock
      await wrapper.find('.lock-toggle').trigger('click')
      await flushPromises()
      await wrapper.find('.modal-actions .btn-primary').trigger('click')
      await flushPromises()
      // Open share modal
      await wrapper.find('.manage-shares-btn').trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('Manage Sharing')

      // Stub the API: create returns the new share; refetch returns updated list
      mockSharesApi.create.mockResolvedValue({})
      mockAdminApi.getLists.mockResolvedValueOnce([
        listWithShare({ shares: [{ id: 's1', role: 'editor', user: sharedUser }] }),
      ])

      // Fill in the share form
      const input = wrapper.find('.share-add-form input')
      await input.setValue('bob@example.com')
      await wrapper.find('.share-add-form').trigger('submit')
      await flushPromises()

      expect(mockSharesApi.create).toHaveBeenCalledWith('l1', 'bob@example.com', 'editor')
      cleanup()
    })

    it('removes a share through the modal', async () => {
      const wrapper = mountWith([
        listWithShare({ shares: [{ id: 's1', role: 'editor', user: sharedUser }] }),
      ])
      await flushPromises()
      // Unlock
      await wrapper.find('.lock-toggle').trigger('click')
      await flushPromises()
      await wrapper.find('.modal-actions .btn-primary').trigger('click')
      await flushPromises()
      // Open share modal
      await wrapper.find('.manage-shares-btn').trigger('click')
      await flushPromises()
      mockSharesApi.remove.mockResolvedValue(undefined)
      mockAdminApi.getLists.mockResolvedValueOnce([listWithShare()])

      await wrapper.find('.share-remove').trigger('click')
      await flushPromises()

      expect(mockSharesApi.remove).toHaveBeenCalledWith('l1', 's1')
      cleanup()
    })

    it('updates a share role through the modal', async () => {
      const wrapper = mountWith([
        listWithShare({ shares: [{ id: 's1', role: 'editor', user: sharedUser }] }),
      ])
      await flushPromises()
      // Unlock
      await wrapper.find('.lock-toggle').trigger('click')
      await flushPromises()
      await wrapper.find('.modal-actions .btn-primary').trigger('click')
      await flushPromises()
      // Open share modal
      await wrapper.find('.manage-shares-btn').trigger('click')
      await flushPromises()
      mockSharesApi.updateRole.mockResolvedValue(undefined)
      mockAdminApi.getLists.mockResolvedValueOnce([
        listWithShare({ shares: [{ id: 's1', role: 'viewer', user: sharedUser }] }),
      ])

      const select = wrapper.find('.share-role')
      await select.setValue('viewer')
      await flushPromises()

      expect(mockSharesApi.updateRole).toHaveBeenCalledWith('l1', 's1', 'viewer')
      cleanup()
    })

    it('closes the share manage modal', async () => {
      const wrapper = mountWith([listWithShare()])
      await flushPromises()
      // Unlock
      await wrapper.find('.lock-toggle').trigger('click')
      await flushPromises()
      await wrapper.find('.modal-actions .btn-primary').trigger('click')
      await flushPromises()
      // Open share modal
      await wrapper.find('.manage-shares-btn').trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('Manage Sharing')

      // The share modal has its own Close button
      const closeBtn = wrapper.findAll('.modal-actions button').find((b) => b.text() === 'Close')!
      await closeBtn.trigger('click')
      await flushPromises()
      expect(wrapper.text()).not.toContain('Manage Sharing')
      cleanup()
    })
  })
})
