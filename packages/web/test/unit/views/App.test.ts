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

  it('shows username in nav when authenticated (no firstName)', async () => {
    const fakeUser = { id: 'u1', email: 'a@b.com', username: 'alice', createdAt: '2024-01-01' }
    mockAuthApi.me.mockResolvedValue(fakeUser)
    localStorage.setItem('auth_token', 'valid-token')
    pinia = createPinia()
    setActivePinia(pinia)
    const { wrapper } = mountApp()
    await flushPromises()
    expect(wrapper.text()).toContain('alice')
  })

  it('shows first name instead of username when firstName is set', async () => {
    const fakeUser = {
      id: 'u1',
      email: 'a@b.com',
      username: 'alice',
      firstName: 'Alice',
      createdAt: '2024-01-01',
    }
    mockAuthApi.me.mockResolvedValue(fakeUser)
    localStorage.setItem('auth_token', 'valid-token')
    pinia = createPinia()
    setActivePinia(pinia)
    const { wrapper } = mountApp()
    await flushPromises()
    expect(wrapper.find('.nav-username').text()).toContain('Alice')
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

  it('logout button calls logout', async () => {
    const fakeUser = { id: 'u1', email: 'a@b.com', username: 'alice', createdAt: '2024-01-01' }
    mockAuthApi.me.mockResolvedValue(fakeUser)
    localStorage.setItem('auth_token', 'valid-token')
    pinia = createPinia()
    setActivePinia(pinia)
    const { wrapper } = mountApp()
    await flushPromises()
    await wrapper.find('.btn-ghost').trigger('click')
    // After logout, nav should be hidden
    await flushPromises()
    expect(wrapper.find('.nav-bar').exists()).toBe(false)
  })

  it('theme toggle button is visible when authenticated', async () => {
    const fakeUser = { id: 'u1', email: 'a@b.com', username: 'alice', createdAt: '2024-01-01' }
    mockAuthApi.me.mockResolvedValue(fakeUser)
    localStorage.setItem('auth_token', 'valid-token')
    pinia = createPinia()
    setActivePinia(pinia)
    const { wrapper } = mountApp()
    await flushPromises()
    expect(wrapper.find('.btn-icon').exists()).toBe(true)
    // Toggle theme
    await wrapper.find('.btn-icon').trigger('click')
    expect(wrapper.find('.btn-icon').exists()).toBe(true)
  })
})
