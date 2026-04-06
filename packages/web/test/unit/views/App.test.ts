import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '../../../src/App.vue'

const { mockAuthApi } = vi.hoisted(() => ({
  mockAuthApi: { login: vi.fn(), register: vi.fn(), me: vi.fn() },
}))

vi.mock('../../../src/api/auth.api', () => ({ authApi: mockAuthApi }))

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>Dashboard</div>' } },
      { path: '/login', component: { template: '<div>Login</div>' }, meta: { public: true } },
      { path: '/calendar', component: { template: '<div>Calendar</div>' } },
      { path: '/audit', component: { template: '<div>Audit</div>' } },
      { path: '/profile', component: { template: '<div>Profile</div>' } },
    ],
  })
}

let pinia: ReturnType<typeof createPinia>

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  localStorage.clear()
  vi.clearAllMocks()
})

function mountApp() {
  const router = makeRouter()
  return { wrapper: mount(App, { global: { plugins: [pinia, router] } }), router }
}

describe('App.vue', () => {
  it('hides nav when user is not authenticated', async () => {
    const { wrapper } = mountApp()
    await flushPromises()
    expect(wrapper.find('.nav-bar').exists()).toBe(false)
  })

  it('shows nav when user is authenticated', async () => {
    const fakeUser = { id: 'u1', email: 'a@b.com', username: 'alice', createdAt: '2024-01-01' }
    mockAuthApi.me.mockResolvedValue(fakeUser)
    localStorage.setItem('auth_token', 'valid-token')
    // Re-create pinia so auth store picks up the localStorage token
    pinia = createPinia()
    setActivePinia(pinia)
    const { wrapper } = mountApp()
    await flushPromises()
    expect(wrapper.find('.nav-bar').exists()).toBe(true)
  })

  it('calls fetchMe on mount', async () => {
    localStorage.setItem('auth_token', 'some-token')
    pinia = createPinia()
    setActivePinia(pinia)
    mockAuthApi.me.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      username: 'alice',
      createdAt: '2024-01-01',
    })
    mountApp()
    await flushPromises()
    expect(mockAuthApi.me).toHaveBeenCalled()
  })

  it('shows avatar fallback with first letter of username', async () => {
    const fakeUser = { id: 'u1', email: 'a@b.com', username: 'alice', createdAt: '2024-01-01' }
    mockAuthApi.me.mockResolvedValue(fakeUser)
    localStorage.setItem('auth_token', 'valid-token')
    pinia = createPinia()
    setActivePinia(pinia)
    const { wrapper } = mountApp()
    await flushPromises()
    expect(wrapper.find('.avatar-fallback').text()).toBe('A')
  })

  it('shows avatar image when avatarUrl is set', async () => {
    const fakeUser = {
      id: 'u1',
      email: 'a@b.com',
      username: 'alice',
      firstName: 'Alice',
      avatarUrl: 'https://example.com/photo.jpg',
      createdAt: '2024-01-01',
    }
    mockAuthApi.me.mockResolvedValue(fakeUser)
    localStorage.setItem('auth_token', 'valid-token')
    pinia = createPinia()
    setActivePinia(pinia)
    const { wrapper } = mountApp()
    await flushPromises()
    expect(wrapper.find('.avatar-img').attributes('src')).toBe('https://example.com/photo.jpg')
  })

  it('nav links include icons for Lists, Calendar, and Log', async () => {
    const fakeUser = { id: 'u1', email: 'a@b.com', username: 'alice', createdAt: '2024-01-01' }
    mockAuthApi.me.mockResolvedValue(fakeUser)
    localStorage.setItem('auth_token', 'valid-token')
    pinia = createPinia()
    setActivePinia(pinia)
    const { wrapper } = mountApp()
    await flushPromises()
    const navText = wrapper.find('.nav-links').text()
    expect(navText).toContain('Lists')
    expect(navText).toContain('Calendar')
    expect(navText).toContain('Log')
  })

  it('avatar dropdown shows logout and profile', async () => {
    const fakeUser = { id: 'u1', email: 'a@b.com', username: 'alice', createdAt: '2024-01-01' }
    mockAuthApi.me.mockResolvedValue(fakeUser)
    localStorage.setItem('auth_token', 'valid-token')
    pinia = createPinia()
    setActivePinia(pinia)
    const { wrapper } = mountApp()
    await flushPromises()
    // Open avatar dropdown
    await wrapper.find('.avatar-btn').trigger('click')
    expect(wrapper.find('.avatar-dropdown').exists()).toBe(true)
    expect(wrapper.text()).toContain('Logout')
    expect(wrapper.text()).toContain('Profile')
  })

  it('avatar dropdown contains profile, settings, about and logout', async () => {
    const fakeUser = { id: 'u1', email: 'a@b.com', username: 'alice', createdAt: '2024-01-01' }
    mockAuthApi.me.mockResolvedValue(fakeUser)
    localStorage.setItem('auth_token', 'valid-token')
    pinia = createPinia()
    setActivePinia(pinia)
    const { wrapper } = mountApp()
    await flushPromises()
    await wrapper.find('.avatar-btn').trigger('click')
    expect(wrapper.find('.avatar-dropdown').exists()).toBe(true)
    expect(wrapper.text()).toContain('Profile')
    expect(wrapper.text()).toContain('Settings')
    expect(wrapper.text()).toContain('About')
    expect(wrapper.text()).toContain('Logout')
  })

  it('closes dropdown when clicking outside', async () => {
    const fakeUser = { id: 'u1', email: 'a@b.com', username: 'alice', createdAt: '2024-01-01' }
    mockAuthApi.me.mockResolvedValue(fakeUser)
    localStorage.setItem('auth_token', 'valid-token')
    pinia = createPinia()
    setActivePinia(pinia)
    const { wrapper } = mountApp()
    await flushPromises()
    // Open dropdown
    await wrapper.find('.avatar-btn').trigger('click')
    expect(wrapper.find('.avatar-dropdown').exists()).toBe(true)
    // Click outside — simulate clicking on the body
    document.body.click()
    await flushPromises()
    expect(wrapper.find('.avatar-dropdown').exists()).toBe(false)
  })

  it('logout clears auth and hides nav', async () => {
    const fakeUser = { id: 'u1', email: 'a@b.com', username: 'alice', createdAt: '2024-01-01' }
    mockAuthApi.me.mockResolvedValue(fakeUser)
    localStorage.setItem('auth_token', 'valid-token')
    pinia = createPinia()
    setActivePinia(pinia)
    const { wrapper } = mountApp()
    await flushPromises()
    // Open dropdown and click logout
    await wrapper.find('.avatar-btn').trigger('click')
    const logoutBtn = wrapper.findAll('.dropdown-item').find((b) => b.text().includes('Logout'))
    await logoutBtn!.trigger('click')
    await flushPromises()
    expect(wrapper.find('.nav-bar').exists()).toBe(false)
  })
})
