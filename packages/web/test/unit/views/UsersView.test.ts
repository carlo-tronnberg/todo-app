import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import UsersView from '../../../src/views/UsersView.vue'

const { mockAdminApi } = vi.hoisted(() => ({
  mockAdminApi: {
    getUsers: vi.fn(),
    updateUser: vi.fn(),
  },
}))

vi.mock('../../../src/api/admin.api', () => ({ adminApi: mockAdminApi }))

describe('UsersView', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  it('shows loading state', () => {
    mockAdminApi.getUsers.mockReturnValue(new Promise(() => {}))
    const wrapper = mount(UsersView, { global: { plugins: [pinia] } })
    expect(wrapper.text()).toContain('Loading')
  })

  it('renders users table', async () => {
    mockAdminApi.getUsers.mockResolvedValue([
      {
        id: 'u1',
        email: 'alice@example.com',
        username: 'alice',
        firstName: 'Alice',
        lastName: 'Smith',
        isAdmin: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ])
    const wrapper = mount(UsersView, { global: { plugins: [pinia] } })
    await flushPromises()
    expect(wrapper.text()).toContain('alice@example.com')
    expect(wrapper.text()).toContain('Alice Smith')
  })

  it('shows error on access denied', async () => {
    mockAdminApi.getUsers.mockRejectedValue(new Error('403'))
    const wrapper = mount(UsersView, { global: { plugins: [pinia] } })
    await flushPromises()
    expect(wrapper.text()).toContain('Access denied')
  })

  it('toggles admin status', async () => {
    const user = {
      id: 'u1',
      email: 'bob@example.com',
      username: 'bob',
      firstName: null,
      lastName: null,
      isAdmin: false,
      createdAt: '2026-01-01T00:00:00Z',
    }
    mockAdminApi.getUsers.mockResolvedValue([user])
    mockAdminApi.updateUser.mockResolvedValue({ ...user, isAdmin: true })
    const wrapper = mount(UsersView, { global: { plugins: [pinia] } })
    await flushPromises()

    await wrapper.find('input[type="checkbox"]').trigger('change')
    await flushPromises()
    expect(mockAdminApi.updateUser).toHaveBeenCalledWith('u1', { isAdmin: true })
  })
})
