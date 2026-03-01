import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import RegisterView from '../../../src/views/RegisterView.vue'

const { mockAuthApi } = vi.hoisted(() => ({
  mockAuthApi: { login: vi.fn(), register: vi.fn(), me: vi.fn() },
}))

vi.mock('../../../src/api/auth.api', () => ({ authApi: mockAuthApi }))

const fakeUser = { id: 'u1', email: 'a@b.com', username: 'alice', createdAt: '2024-01-01' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>Home</div>' } },
      { path: '/login', component: { template: '<div>Login</div>' } },
      { path: '/register', component: RegisterView },
    ],
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

function mountRegister() {
  const router = makeRouter()
  const pinia = createPinia()
  setActivePinia(pinia)
  return { wrapper: mount(RegisterView, { global: { plugins: [pinia, router] } }), router }
}

describe('RegisterView', () => {
  it('renders username, email and password inputs', () => {
    const { wrapper } = mountRegister()
    expect(wrapper.find('#username').exists()).toBe(true)
    expect(wrapper.find('#email').exists()).toBe(true)
    expect(wrapper.find('#password').exists()).toBe(true)
  })

  it('renders the Create Account heading', () => {
    const { wrapper } = mountRegister()
    expect(wrapper.text()).toContain('Create Account')
  })

  it('calls auth.register with form values on submit', async () => {
    mockAuthApi.register.mockResolvedValue({ token: 'tok', user: fakeUser })
    const { wrapper } = mountRegister()
    await wrapper.find('#username').setValue('alice')
    await wrapper.find('#email').setValue('a@b.com')
    await wrapper.find('#password').setValue('pass1234')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mockAuthApi.register).toHaveBeenCalledWith({
      email: 'a@b.com',
      username: 'alice',
      password: 'pass1234',
    })
  })

  it('navigates to / after successful registration', async () => {
    mockAuthApi.register.mockResolvedValue({ token: 'tok', user: fakeUser })
    const { wrapper, router } = mountRegister()
    await wrapper.find('#username').setValue('alice')
    await wrapper.find('#email').setValue('a@b.com')
    await wrapper.find('#password').setValue('pass1234')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('shows server error message from response on failure', async () => {
    const apiError = { response: { data: { message: 'Email already in use' } } }
    mockAuthApi.register.mockRejectedValue(apiError)
    const { wrapper } = mountRegister()
    await wrapper.find('#username').setValue('alice')
    await wrapper.find('#email').setValue('taken@b.com')
    await wrapper.find('#password').setValue('pass1234')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Email already in use')
  })

  it('shows generic fallback message when no server message available', async () => {
    mockAuthApi.register.mockRejectedValue(new Error('Unknown'))
    const { wrapper } = mountRegister()
    await wrapper.find('#username').setValue('alice')
    await wrapper.find('#email').setValue('a@b.com')
    await wrapper.find('#password').setValue('pass1234')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Registration failed')
  })

  it('disables submit button while loading', async () => {
    let resolve!: (v: any) => void
    mockAuthApi.register.mockReturnValue(new Promise((r) => (resolve = r)))
    const { wrapper } = mountRegister()
    await wrapper.find('#username').setValue('alice')
    await wrapper.find('#email').setValue('a@b.com')
    await wrapper.find('#password').setValue('pass1234')
    await wrapper.find('form').trigger('submit')
    const btn = wrapper.find('button[type="submit"]')
    expect(btn.attributes('disabled')).toBeDefined()
    resolve({ token: 'tok', user: fakeUser })
    await flushPromises()
  })
})
